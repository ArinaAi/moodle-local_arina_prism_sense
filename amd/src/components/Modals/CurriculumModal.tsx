// components/modals/CurriculumModal.tsx - Enhanced Version
// Card-based single section selection with modern UI
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
  Skeleton,
  Card,
  CardContent,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Fade,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, CheckCircle, WarningAmber } from '@mui/icons-material';
import { FileText, FolderOpen } from 'lucide-react';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import type { MoodleContext } from '../../types/moodle';
import type { CurriculumStructure } from '../../types/app';

interface CurriculumModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (curriculum: CurriculumStructure, contentStrategy: 'standard' | 'example_driven', sectionId: number, videoLength: string) => void;
  moodleContext: MoodleContext;
}

interface SectionWithSources {
  id: number;
  name: string;
  sourceCount: number;
  curriculum?: string;
  hasCurriculum?: boolean;
  curriculumChecked: boolean; // true once the API call has resolved
}

// Compose all styles
const getModalStyles = (isMobile: boolean) => {
  const baseBoxStyles = getModalBoxStyles(isMobile, { sm: '85%', md: '750px' });
  const layoutStyles = getModalLayoutStyles(isMobile);

  return {
    modal: {
      ...baseBoxStyles,
      // specific overrides for CurriculumModal
      boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
    },
    ...layoutStyles,
    // Add missing properties from original getModalLayoutStyles/Misc
    header: { px: isMobile ? 2 : 3.5, py: isMobile ? 2 : 3 },
    content: { px: isMobile ? 2 : 3.5, py: isMobile ? 2 : 3 },
    footer: {
      px: isMobile ? 2 : 3.5,
      pb: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : 2.5,
      pt: isMobile ? 2 : 2.5,
      flexDirection: isMobile ? 'column-reverse' as const : 'row' as const,
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? 1.5 : 2,
    },
    buttonPy: isMobile ? 1.25 : 1,
  };
};

const CurriculumModal: React.FC<CurriculumModalProps> = ({
  open,
  onClose,
  onGenerate,
  moodleContext,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [sectionsWithSources, setSectionsWithSources] = useState<SectionWithSources[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const contentStrategy = 'standard';
  const [videoLength, setVideoLength] = useState<string>('5');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [curriculumText, setCurriculumText] = useState('');

  // Use external helper function
  const styles = getModalStyles(isMobile);

  // Load sections with sources when modal opens
  useEffect(() => {
    if (open && moodleContext) {
      loadSectionsWithSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moodleContext]);

  const loadSectionsWithSources = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load sources');
      }

      // Group sources by section
      const sourcesBySection: Record<number, number> = {};
      if (data.sources && Array.isArray(data.sources)) {
        data.sources.forEach((source: { sectionid: number }) => {
          sourcesBySection[source.sectionid] = (sourcesBySection[source.sectionid] || 0) + 1;
        });
      }

      // Filter sections that have sources
      const baseSections = moodleContext.sections
        .filter((section) => sourcesBySection[section.id] && sourcesBySection[section.id] > 0)
        .map((section) => ({
          id: section.id,
          name: section.name,
          sourceCount: sourcesBySection[section.id],
          hasCurriculum: false as boolean | undefined,
          curriculum: undefined as string | undefined,
          curriculumChecked: false,
        }));

      if (baseSections.length === 0) {
        throw new Error('No sections with uploaded sources found. Please upload PDFs first.');
      }

      // Parallel curriculum check for all sections
      const curriculumResults = await Promise.allSettled(
        baseSections.map((section) =>
          fetch(
            `${moodleContext.wwwroot}/local/lecturebot/api/get_curriculum.php?courseid=${moodleContext.courseid}&sectionid=${section.id}`,
            { method: 'GET', credentials: 'include' }
          ).then((res) => res.json())
        )
      );

      const sections: SectionWithSources[] = baseSections.map((section, idx) => {
        const result = curriculumResults[idx];
        if (result.status === 'fulfilled' && result.value?.status === 'success') {
          const text: string = result.value.curriculum ?? '';
          return {
            ...section,
            hasCurriculum: text.trim().length > 0,
            curriculum: text,
            curriculumChecked: true,
          };
        }
        // On fetch failure, treat as unknown — don't block the section
        return { ...section, hasCurriculum: undefined, curriculumChecked: true };
      });

      setSectionsWithSources(sections);

      // Auto-select first section that has curriculum; fall back to first section if none
      const firstValid = sections.find((s) => s.hasCurriculum === true);
      setSelectedSectionId(firstValid ? firstValid.id : null);
    } catch (err) {
      console.error('Error loading sources:', err);
      setError('Failed to load sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewCurriculum = (sectionId: number) => {
    const section = sectionsWithSources.find((s) => s.id === sectionId);
    if (!section) { return; }
    setCurriculumText(section.curriculum || '');
    setShowCurriculum(true);
  };

  const handleGenerate = () => {
    if (!selectedSectionId) {
      setError('Please select a section');
      return;
    }

    // Create a simple curriculum structure
    // The actual curriculum will be fetched from the course section on the backend
    const section = sectionsWithSources.find((s) => s.id === selectedSectionId);

    const curriculum: CurriculumStructure = {
      status: 'success',
      curriculum_structure: [
        {
          title: section?.name || 'Section Content',
          type: 'topic',
          subtopics: [
            {
              title: 'Content',
              type: 'sub-topic',
            },
          ],
        },
      ],
    };

    onClose();
    onGenerate(curriculum, contentStrategy, selectedSectionId, videoLength);
  };

  /* Helper Functions */
  const renderLoadingState = () => (
    <Box sx={{ display: 'grid', gap: 2.5, mb: 3 }}>
      {[1, 2, 3].map((item) => (
        <Card
          key={`skeleton-section-${item}`}
          sx={{
            border: '2px solid #e9ecef',
            borderRadius: '12px',
            bgcolor: 'white',
            boxShadow: 'none',
            opacity: 1 - (item * 0.15), // Staggered opacity
          }}
        >
          <CardContent sx={{ p: 'clamp(16px, 2vw + 12px, 24px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5vw + 8px, 20px)' }}>
              {/* Icon Skeleton */}
              <Skeleton
                variant="rounded"
                animation="wave"
                sx={{
                  width: 'clamp(40px, 4vw + 24px, 48px)',
                  height: 'clamp(40px, 4vw + 24px, 48px)',
                  borderRadius: '12px',
                  flexShrink: 0,
                }}
              />

              {/* Content Skeleton */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton
                  variant="text"
                  animation="wave"
                  width="60%"
                  height={24}
                  sx={{ mb: 'clamp(2px, 0.5vw, 6px)' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="rounded" width={50} height={20} animation="wave" sx={{ borderRadius: 1 }} />
                  <Skeleton variant="rounded" width={100} height={20} animation="wave" sx={{ borderRadius: 1 }} />
                </Box>
              </Box>

              {/* Radio Button Skeleton - aligned to right */}
              <Skeleton
                variant="circular"
                width={20}
                height={20}
                animation="wave"
                sx={{ ml: 1 }}
              />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <FolderOpen size={64} color="#ced4da" strokeWidth={1.5} />
      <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        No sources are uploaded yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Please upload sources first before generating slides.
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={onClose}
        sx={{ textTransform: 'none' }}
      >
        Go Back
      </Button>
    </Box>
  );

  const renderSectionSelection = () => {
    const allMissingCurriculum =
      sectionsWithSources.length > 0 &&
      sectionsWithSources.every((s) => s.curriculumChecked && s.hasCurriculum === false);

    return (
      <>
        {/* Global warning when every section is missing curriculum */}
        {allMissingCurriculum && (
          <Alert
            severity="warning"
            icon={<WarningAmber fontSize="small" />}
            sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8rem', alignItems: 'flex-start' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
              No curriculum found in any section.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              In each section, add a <strong>Text &amp; Media</strong> area titled exactly{' '}
              <strong>&ldquo;Curriculum&rdquo;</strong> and paste your curriculum inside it.
            </Typography>
          </Alert>
        )}

        {/* Section Cards */}
        <Box sx={{ display: 'grid', gap: 2.5, mb: 3 }}>
          {sectionsWithSources.map((section, index) => {
            const missingCurriculum = section.curriculumChecked && section.hasCurriculum === false;
            const isSelected = selectedSectionId === section.id;

            return (
              <Fade in key={section.id} timeout={300 + index * 100}>
                <Card
                  onClick={() => {
                    if (!missingCurriculum) { setSelectedSectionId(section.id); }
                  }}
                  sx={{
                    border: missingCurriculum
                      ? '2px solid #e9ecef'
                      : isSelected
                        ? '2px solid #0f6cbf'
                        : '2px solid #e9ecef',
                    borderRadius: '12px',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    bgcolor: missingCurriculum
                      ? '#fafafa'
                      : isSelected
                        ? 'rgba(15, 108, 191, 0.05)'
                        : 'white',
                    boxShadow: isSelected && !missingCurriculum ? '0 4px 12px rgba(15, 108, 191, 0.15)' : 'none',
                    cursor: missingCurriculum ? 'not-allowed' : 'pointer',
                    opacity: missingCurriculum ? 0.65 : 1,
                    '&:hover': missingCurriculum
                      ? {}
                      : {
                        borderColor: '#0f6cbf',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 20px rgba(15, 108, 191, 0.18)',
                      },
                    '&:active': missingCurriculum ? {} : { transform: 'scale(0.98)' },
                  }}
                >
                  <CardContent sx={{ p: 'clamp(16px, 2vw + 12px, 24px)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5vw + 8px, 20px)' }}>
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 'clamp(40px, 4vw + 24px, 48px)',
                          height: 'clamp(40px, 4vw + 24px, 48px)',
                          borderRadius: '12px',
                          bgcolor: missingCurriculum
                            ? 'rgba(200, 200, 200, 0.3)'
                            : isSelected
                              ? '#0f6cbf'
                              : 'rgba(15, 108, 191, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        {isSelected && !missingCurriculum ? (
                          <CheckCircle sx={{ color: 'white', fontSize: 'clamp(24px, 2.5vw + 14px, 28px)' }} />
                        ) : missingCurriculum ? (
                          <WarningAmber sx={{ color: '#b45309', fontSize: 'clamp(20px, 2vw + 12px, 24px)' }} />
                        ) : (
                          <FileText
                            color="#0f6cbf"
                            strokeWidth={2.5}
                            style={{ width: 'clamp(20px, 2vw + 12px, 24px)', height: 'clamp(20px, 2vw + 12px, 24px)' }}
                          />
                        )}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: missingCurriculum ? '#6c757d' : isSelected ? '#0f6cbf' : '#1a1a1a',
                            mb: 'clamp(4px, 0.5vw + 2px, 8px)',
                            fontSize: 'clamp(0.95rem, 1vw + 0.75rem, 1.05rem)',
                            lineHeight: 1.3,
                          }}
                        >
                          {section.name}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${section.sourceCount} PDF${section.sourceCount === 1 ? '' : 's'}`}
                            size="small"
                            sx={{
                              bgcolor: missingCurriculum ? 'rgba(0,0,0,0.06)' : 'rgba(13, 92, 162, 0.1)',
                              color: missingCurriculum ? '#6c757d' : '#0D5CA2',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />

                          {/* Show View Curriculum only when curriculum exists */}
                          {!missingCurriculum && section.curriculum && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handlePreviewCurriculum(section.id);
                              }}
                              sx={{
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                minWidth: 'auto',
                                padding: '2px 8px',
                                fontWeight: 600,
                                borderRadius: 2,
                                border: '1px solid #0f6cbf',
                                '&:hover': {
                                  bgcolor: 'rgba(15, 108, 191, 0.1)',
                                },
                              }}
                            >
                              View Curriculum
                            </Button>
                          )}

                          {/* Inline warning when curriculum is missing */}
                          {missingCurriculum && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#b45309',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              No curriculum · Add a <em>Text &amp; Media</em> area titled &ldquo;Curriculum&rdquo;
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Radio — disabled for missing curriculum */}
                      <Radio
                        checked={isSelected}
                        disabled={missingCurriculum}
                        value={section.id}
                        sx={{
                          color: '#adb5bd',
                          '&.Mui-checked': { color: '#0f6cbf' },
                          '&:focus': { outline: 'none !important' },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            );
          })}
        </Box>

        {/* Presentation Depth Selector */}
        <Paper
          variant="outlined"
          sx={{
            p: 'clamp(16px, 2vw + 12px, 24px)',
            borderRadius: '12px',
            bgcolor: 'white',
            border: '2px solid #e9ecef',
            transition: 'all 0.3s ease',
            mb: 2.5,
            '&:hover': {
              borderColor: '#0f6cbf',
              boxShadow: '0 4px 12px rgba(15, 108, 191, 0.15)',
            },
          }}
        >
          <FormControl component="fieldset" fullWidth>
            <Tooltip
              title="Determines the depth and detail level for the generated presentation"
              arrow
              placement="top"
              PopperProps={{
                sx: {
                  zIndex: 100002,
                },
              }}
            >
              <FormLabel
                component="legend"
                sx={{
                  mb: 'clamp(8px, 1.5vw + 4px, 12px)',
                  '&.Mui-focused': {
                    color: '#1a1a1a',
                  },
                  cursor: 'help',
                  width: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    Presentation Depth
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Video duration scales with slide count.
                </Typography>
              </FormLabel>
            </Tooltip>
            <RadioGroup
              value={videoLength}
              onChange={(e) => setVideoLength(e.target.value)}
            >
              <FormControlLabel
                value="5"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Express (~15m)
                      </Typography>
                      <Chip label="6 Credits" size="small" sx={{ bgcolor: 'rgba(15, 108, 191, 0.1)', color: '#0f6cbf', fontWeight: 600, fontSize: '0.65rem', height: '18px' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Quick summary or intro.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                value="15"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Standard (~30m)
                      </Typography>
                      <Chip label="8 Credits" size="small" sx={{ bgcolor: 'rgba(15, 108, 191, 0.1)', color: '#0f6cbf', fontWeight: 600, fontSize: '0.65rem', height: '18px' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Complete general overview.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                value="30"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Extensive (~45m)
                      </Typography>
                      <Chip
                        label="Recommended"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(46, 125, 50, 0.1)',
                          color: '#2e7d32',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: '18px',
                        }}
                      />
                      <Chip label="10 Credits" size="small" sx={{ bgcolor: 'rgba(15, 108, 191, 0.1)', color: '#0f6cbf', fontWeight: 600, fontSize: '0.65rem', height: '18px' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      In-depth analysis.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
              />

            </RadioGroup>
          </FormControl>
        </Paper>


      </>
    );
  };

  const renderContent = () => {
    if (loading) {
      return renderLoadingState();
    }

    if (sectionsWithSources.length === 0) {
      return renderEmptyState();
    }

    return renderSectionSelection();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        disablePortal={false}
        container={() => document.body}
        sx={{
          zIndex: 100001,
        }}
      >
        <Box
          sx={{
            ...styles.modal,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              ...styles.header,
              borderBottom: '2px solid #e9ecef',
              bgcolor: 'white',
              // Never shrink header
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0 }}>
              <Box>
                <Typography
                  variant={styles.titleVariant}
                  component="h2"
                  sx={{ fontWeight: 700, mb: 0.5 }}
                >
                  Generate Slide Deck
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Select a section with uploaded sources
                </Typography>
              </Box>
              <IconButton
                onClick={onClose}
                sx={{
                  mt: -0.5,
                  ...styles.touchTarget,
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{
            ...styles.content,
            overflow: 'auto',
            flex: 1,
            // IMPORTANT: allows children to shrink below content size
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {renderContent()}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              ...styles.footer,
              borderTop: '2px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              // Never shrink footer
              flexShrink: 0,
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              fullWidth={isMobile}
              sx={{
                fontWeight: 600,
                px: 3,
                py: styles.buttonPy,
                ...styles.touchTarget,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!selectedSectionId || loading}
              fullWidth={isMobile}
              sx={{
                fontWeight: 600,
                px: 4,
                py: 1.25,
                ...styles.touchTarget,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                  boxShadow: '0 4px 12px rgba(15, 108, 191, 0.4)',
                },
                '&:disabled': {
                  background: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
            >
              Generate Slides
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Curriculum Preview Dialog */}
      <Modal
        open={showCurriculum}
        onClose={() => setShowCurriculum(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100002 }}
      >
        <Fade in={showCurriculum}>
          <Box
            sx={{
              position: 'relative',
              width: { xs: '90%', sm: '80%', md: '600px' },
              maxHeight: '80vh',
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 24,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              // Pop-in animation
              '@keyframes popIn': {
                '0%': { opacity: 0, transform: 'scale(0.95)' },
                '100%': { opacity: 1, transform: 'scale(1)' },
              },
              animation: 'popIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
            }}
          >
            <Box
              sx={{
                p: 2.5,
                borderBottom: '2px solid #e9ecef',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Section Curriculum
              </Typography>
              <IconButton onClick={() => setShowCurriculum(false)} size="small">
                <Close />
              </IconButton>
            </Box>
            <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  bgcolor: curriculumText.startsWith('⚠️') ? '#fff3cd' : '#f8f9fa',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  borderRadius: 2,
                  border: curriculumText.startsWith('⚠️') ? '2px solid #ffc107' : '1px solid #e9ecef',
                }}
              >
                {curriculumText || 'No curriculum text available'}
              </Paper>
            </Box>
            <Box sx={{ p: 2.5, borderTop: '2px solid #e9ecef', textAlign: 'right' }}>
              <Button
                variant="contained"
                onClick={() => setShowCurriculum(false)}
                sx={{ fontWeight: 600 }}
              >
                Close
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

export default CurriculumModal;