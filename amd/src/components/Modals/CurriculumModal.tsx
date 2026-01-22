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
  CircularProgress,
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
import { Close, CheckCircle } from '@mui/icons-material';
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
  const [contentStrategy, setContentStrategy] = useState<'standard' | 'example_driven'>('standard');
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
      const sections = moodleContext.sections
        .filter((section) => sourcesBySection[section.id] && sourcesBySection[section.id] > 0)
        .map((section) => ({
          id: section.id,
          name: section.name,
          sourceCount: sourcesBySection[section.id],
          hasCurriculum: false, // Will be checked when user clicks preview
        }));

      if (sections.length === 0) {
        throw new Error('No sections with uploaded sources found. Please upload PDFs first.');
      }

      setSectionsWithSources(sections);

      // Auto-select first section if available
      if (sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewCurriculum = async (sectionId: number) => {
    try {
      // Find the section object to get its data
      const section = moodleContext.sections.find(s => s.id === sectionId);
      if (!section) {
        throw new Error('Section not found');
      }

      const response = await fetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/get_curriculum.php?courseid=${moodleContext.courseid}&sectionid=${sectionId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.error || 'Failed to fetch curriculum');
      }

      if (!data.curriculum || data.curriculum.trim() === '') {
        setCurriculumText('⚠️ No curriculum found in this section. Please add a "Text and media area" with curriculum content or add text to the section summary.');

        // Update section to mark it has no curriculum (with empty string to indicate we've checked)
        setSectionsWithSources(prev =>
          prev.map(s => s.id === sectionId ? { ...s, hasCurriculum: false, curriculum: '' } : s)
        );
      } else {
        setCurriculumText(data.curriculum);

        // Update section to mark it has curriculum
        setSectionsWithSources(prev =>
          prev.map(s => s.id === sectionId ? { ...s, hasCurriculum: true, curriculum: data.curriculum } : s)
        );
      }

      setShowCurriculum(true);
    } catch (err) {
      setError((err as Error).message);
    }
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
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
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
        No Sections with Sources
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload PDFs to sections before generating slides
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

  const renderSectionSelection = () => (
    <>
      {/* Section Cards */}
      <Box sx={{ display: 'grid', gap: 2.5, mb: 3 }}>
        {sectionsWithSources.map((section, index) => (
          <Fade in key={section.id} timeout={300 + index * 100}>
            <Card
              onClick={() => setSelectedSectionId(section.id)}
              sx={{
                border: selectedSectionId === section.id ? '2px solid #0f6cbf' : '2px solid #e9ecef',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                bgcolor: selectedSectionId === section.id ? 'rgba(15, 108, 191, 0.05)' : 'white',
                boxShadow: selectedSectionId === section.id ? '0 4px 12px rgba(15, 108, 191, 0.15)' : 'none',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: '#0f6cbf',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(15, 108, 191, 0.2)',
                },
              }}
            >
              {/* Fluid padding using clamp: min 16px, max 24px */}
              <CardContent sx={{ p: 'clamp(16px, 2vw + 12px, 24px)' }}>
                {/* Fluid gap: min 12px, max 20px */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5vw + 8px, 20px)' }}>
                  {/* Icon */}
                  <Box
                    sx={{
                      // Fluid size: min 40px, max 48px
                      width: 'clamp(40px, 4vw + 24px, 48px)',
                      height: 'clamp(40px, 4vw + 24px, 48px)',
                      borderRadius: '12px',
                      bgcolor: selectedSectionId === section.id ? '#0f6cbf' : 'rgba(15, 108, 191, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {selectedSectionId === section.id ? (
                      <CheckCircle sx={{ color: 'white', fontSize: 'clamp(24px, 2.5vw + 14px, 28px)' }} />
                    ) : (
                      <FileText
                        size={24} // Lucide icons don't support string/clamp directly in size, handled via wrapper or prop modification if needed. But let's leave it simple or use inline style.
                        // Actually Lucide React size prop accepts number or string. 
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
                        color: selectedSectionId === section.id ? '#0f6cbf' : '#1a1a1a',
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
                          bgcolor: 'rgba(13, 92, 162, 0.1)',
                          color: '#0D5CA2',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
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
                          }
                        }}
                      >
                        View Curriculum
                      </Button>
                    </Box>
                    {section.hasCurriculum === false && section.curriculum !== undefined && (
                      <Alert severity="warning" sx={{ mt: 1.5, py: 0.75, borderRadius: 1.5 }}>
                        <Typography variant="caption">
                          ⚠️ No curriculum found - add Text and media area with content
                        </Typography>
                      </Alert>
                    )}
                  </Box>

                  {/* Radio (visual only, card click handles selection) */}
                  <Radio
                    checked={selectedSectionId === section.id}
                    value={section.id}
                    sx={{
                      color: '#adb5bd',
                      '&.Mui-checked': {
                        color: '#0f6cbf',
                      },
                      '&:focus': {
                        outline: 'none !important',
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Fade>
        ))}
      </Box>

      {/* Video Length Selector */}
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
        <FormControl component="fieldset">
          <Tooltip
            title="Determines the target duration for the generated video lecture content"
            arrow
            placement="top"
          >
            <FormLabel
              component="legend"
              sx={{
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 'clamp(8px, 1.5vw + 4px, 12px)',
                '&.Mui-focused': {
                  color: '#1a1a1a',
                },
                cursor: 'help',
              }}
            >
              Video Length
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Short (5 - 10 mins)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Slide: 10 credits • Video: 200 credits
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Medium (15 - 30 mins)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Slide: 10 credits • Video: 400 credits
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Long (30 - 45 mins)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Slide: 10 credits • Video: 600 credits
                  </Typography>
                </Box>
              }
              sx={{ mb: 1.5, ml: 0, alignItems: 'flex-start' }}
            />
            <FormControlLabel
              value="45"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Extended (45 - 60 mins)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Slide: 10 credits • Video: 800 credits
                  </Typography>
                </Box>
              }
              sx={{ ml: 0, alignItems: 'flex-start' }}
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Content Strategy */}
      <Paper
        variant="outlined"
        sx={{
          p: 'clamp(16px, 2vw + 12px, 24px)',
          borderRadius: '12px',
          bgcolor: 'white',
          border: '2px solid #e9ecef',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#0f6cbf',
            boxShadow: '0 4px 12px rgba(15, 108, 191, 0.15)',
          },
        }}
      >
        <FormControl component="fieldset">
          <Tooltip
            title="Choose how the AI generates content: theory-focused or example-driven with practical applications"
            arrow
            placement="top"
          >
            <FormLabel
              component="legend"
              sx={{
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 'clamp(8px, 1.5vw + 4px, 12px)',
                '&.Mui-focused': {
                  color: '#1a1a1a',
                },
                cursor: 'help',
              }}
            >
              Content Strategy
            </FormLabel>
          </Tooltip>
          <RadioGroup
            value={contentStrategy}
            onChange={(e) => setContentStrategy(e.target.value as 'standard' | 'example_driven')}
          >
            <FormControlLabel
              value="standard"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Standard
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Theory-focused content with clear explanations
                  </Typography>
                </Box>
              }
              sx={{ mb: 1.5, ml: 0 }}
            />
            <FormControlLabel
              value="example_driven"
              sx={{ ml: 0 }}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Example-Driven
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Practical examples and real-world applications
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Paper>
    </>
  );

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