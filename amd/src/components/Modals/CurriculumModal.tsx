// components/modals/CurriculumModal.tsx - Enhanced Version
// Card-based single section selection with modern UI
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
  Skeleton,
  Fade,
  Tooltip,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, WarningAmber } from '@mui/icons-material';
import { FolderOpen } from 'lucide-react';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import type { MoodleContext } from '../../types/moodle';
import type { CurriculumStructure } from '../../types/app';
import { useCurriculumData } from '../../hooks/useCurriculumData';
import { CurriculumSectionCard } from './Curriculum/CurriculumSectionCard';
import { CurriculumDepthSelector } from './Curriculum/CurriculumDepthSelector';

interface CurriculumModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (curriculum: CurriculumStructure, contentStrategy: 'standard' | 'example_driven', sectionId: number, videoLength: string, regenOptions?: { parentContentId?: number; feedbackId?: number; regenCount?: number; uploadsRequired?: boolean }) => void;
  moodleContext: MoodleContext;
  /** User's current available credit balance */
  availableBalance: number;
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

// Map videoLength values to credit costs
const CREDIT_COST: Record<string, number> = {
  '5': 6,   // Express
  '15': 8,  // Standard
  '30': 10, // Extensive / Deep Dive
};

const CurriculumModal: React.FC<CurriculumModalProps> = ({
  open,
  onClose,
  onGenerate,
  moodleContext,
  availableBalance,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    sectionsWithSources,
    selectedSectionId,
    contentStrategy,
    videoLength,
    loading,
    error,
    showCurriculum,
    curriculumText,
    addingCurriculumSectionId,
    newCurriculumText,
    isSavingCurriculum,
    saveCurriculumError,
    setError,
    setSelectedSectionId,
    setContentStrategy,
    setVideoLength,
    setShowCurriculum,
    setAddingCurriculumSectionId,
    setNewCurriculumText,
    setSaveCurriculumError,
    handlePreviewCurriculum,
    handleOpenAddCurriculum,
    handleSaveCurriculum,
    handleGenerate,
  } = useCurriculumData(open, onClose, onGenerate, moodleContext);

  // Credit check
  const requiredCredits = CREDIT_COST[videoLength] ?? 6;
  const hasInsufficientCredits = availableBalance < requiredCredits;

  // Use external helper function
  const styles = getModalStyles(isMobile);

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
          {sectionsWithSources.map((section, index) => (
            <CurriculumSectionCard
              key={section.id}
              section={section}
              index={index}
              selectedSectionId={selectedSectionId}
              setSelectedSectionId={setSelectedSectionId}
              addingCurriculumSectionId={addingCurriculumSectionId}
              setAddingCurriculumSectionId={setAddingCurriculumSectionId}
              newCurriculumText={newCurriculumText}
              setNewCurriculumText={setNewCurriculumText}
              saveCurriculumError={saveCurriculumError}
              setSaveCurriculumError={setSaveCurriculumError}
              isSavingCurriculum={isSavingCurriculum}
              handlePreviewCurriculum={handlePreviewCurriculum}
              handleOpenAddCurriculum={handleOpenAddCurriculum}
              handleSaveCurriculum={handleSaveCurriculum}
            />
          ))}
        </Box>

        {/* Presentation Depth Selector */}
        <CurriculumDepthSelector
          videoLength={videoLength}
          setVideoLength={setVideoLength}
          hasInsufficientCredits={hasInsufficientCredits}
          requiredCredits={requiredCredits}
          availableBalance={availableBalance}
        />

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
              PopperProps={{
                sx: {
                  zIndex: 100002,
                },
              }}
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
            <Tooltip
              title={
                hasInsufficientCredits
                  ? `You need ${requiredCredits} credits but only have ${availableBalance} available`
                  : ''
              }
              arrow
              disableHoverListener={!hasInsufficientCredits}
              PopperProps={{ sx: { zIndex: 100003 } }}
            >
              <span>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={!selectedSectionId || loading || hasInsufficientCredits}
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
              </span>
            </Tooltip>
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