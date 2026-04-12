
// App.tsx - Main entry point
import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import '../../types/window';
import MainLayout from '../Layout/MainLayout';
import Header from '../Layout/Header';
import SourcesModal from '../Modals/SourcesModal';
import CurriculumModal from '../Modals/CurriculumModal';
import ContentFeedbackModal from '../Modals/ContentFeedbackModal';
import VideoLectureModal from '../Modals/VideoLectureModal';
import PluginFeedbackModal from '../Modals/PluginFeedbackModal';
import type { ContentFeedbackData } from '../../types/feedback';
import type { PluginFeedback } from '../../types/app';
import { apiFetch, SessionExpiredError } from '../../utils/apiFetch';

// Import refactored modules
import { theme } from '../../theme/theme';
import { appReducer, initialState } from '../../context/state';
import { ErrorBoundary } from './ErrorBoundary';

// Import Custom Hooks
import { useMoodleContext } from '../../hooks/useMoodleContext';
import { useNotification } from '../../hooks/useNotification';
import { usePreviewListener } from '../../hooks/usePreviewListener';
import { useContentPolling } from '../../hooks/useContentPolling';
import { useContentActions } from '../../hooks/useContentActions';
import { useCreditBalance } from '../../hooks/useCreditBalance';
import CreditPill from '../Layout/CreditPill';

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showApproveConfirmation, setShowApproveConfirmation] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Custom Hooks
  const { notification, showNotification, closeNotification } = useNotification();

  useMoodleContext(dispatch, showNotification);
  usePreviewListener(dispatch, showNotification);

  // Credit balance
  const { availableBalance, hasWallet, loading: creditLoading, refresh: refreshCredits } = useCreditBalance(state.moodleContext);
  const hasCredits = hasWallet && availableBalance > 0;
  const creditTooltip = !hasWallet
    ? 'Ask your college admin to allocate you credits'
    : 'You have no credits remaining. Contact your admin for more.';

  useContentPolling(state, dispatch, showNotification, refreshCredits);

  const {
    isLoadingContent,
    loadContentState,
    handleGenerateSlides: _handleGenerateSlides,
    handleGenerateVideoLecture: _handleGenerateVideoLecture,
    handleApproveSlides,
    handlePublishContent,
    handleUnpublishContent,
    handleClearAllContent,
    handleDeleteContent
  } = useContentActions(state, dispatch, showNotification);

  // Wrap generation handlers to auto-refresh credits after completion
  const handleGenerateSlides = useCallback(async (
    ...args: Parameters<typeof _handleGenerateSlides>
  ) => {
    await _handleGenerateSlides(...args);
    refreshCredits();
  }, [_handleGenerateSlides, refreshCredits]);

  const handleGenerateVideoLecture = useCallback(async (
    ...args: Parameters<typeof _handleGenerateVideoLecture>
  ) => {
    await _handleGenerateVideoLecture(...args);
    refreshCredits();
  }, [_handleGenerateVideoLecture, refreshCredits]);

  // Load content state when moodleContext is available
  useEffect(() => {
    if (state.moodleContext) {
      loadContentState();
    }
  }, [state.moodleContext, loadContentState]);

  // Modal Handlers (Simple state toggles can remain here or move to a useModalState hook if preferred, but they are simple enough)
  const handleOpenSourcesModal = useCallback(() => {
    dispatch({ type: 'SHOW_SOURCES_MODAL', payload: true });
  }, []);

  const handleCloseSourcesModal = useCallback(() => {
    dispatch({ type: 'SHOW_SOURCES_MODAL', payload: false });
  }, []);

  const handleOpenFeedbackModal = useCallback(() => {
    dispatch({ type: 'SHOW_FEEDBACK_MODAL', payload: true });
  }, []);

  const handleCloseFeedbackModal = useCallback(() => {
    dispatch({ type: 'SHOW_FEEDBACK_MODAL', payload: false });
  }, []);

  const handleOpenPluginFeedbackModal = useCallback(() => {
    dispatch({ type: 'SHOW_PLUGIN_FEEDBACK_MODAL', payload: true });
  }, []);

  const handleClosePluginFeedbackModal = useCallback(() => {
    dispatch({ type: 'SHOW_PLUGIN_FEEDBACK_MODAL', payload: false });
  }, []);

  const handleOpenCurriculumModal = useCallback(() => {
    dispatch({ type: 'SHOW_CURRICULUM_MODAL', payload: true });
  }, []);

  const handleCloseCurriculumModal = useCallback(() => {
    dispatch({ type: 'SHOW_CURRICULUM_MODAL', payload: false });
  }, []);

  const handleOpenVideoLectureModal = useCallback(() => {
    console.log('🔘 Opening Video Lecture Modal');
    dispatch({ type: 'SHOW_VIDEO_LECTURE_MODAL', payload: true });
  }, []);

  const handleCloseReview = useCallback(() => {
    dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
    dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
    dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });
    showNotification('Preview closed', 'info');
  }, [showNotification]);

  // Approval confirmation handlers
  const handleOpenApproveConfirmation = useCallback(() => {
    setShowApproveConfirmation(true);
  }, []);

  const handleCloseApproveConfirmation = useCallback(() => {
    setShowApproveConfirmation(false);
  }, []);

  const handleConfirmApprove = useCallback(() => {
    setShowApproveConfirmation(false);
    handleApproveSlides();
  }, [handleApproveSlides]);

  // Preview Logic handled by Modal directly calling dispatch usually, 
  // but VideoLectureModal expects onPreviewContent prop



  if (!state.moodleContext) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={32} />
        <Typography variant="body1" color="text.secondary">
          Loading Moodle context...
        </Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            // Use 100dvh (dynamic viewport height) for better mobile support
            // dvh adjusts when mobile browser address bar shows/hides
            minHeight: '100dvh',
            height: '100dvh',
            width: '100%',
            maxWidth: '100vw',
            // REMOVED: overflow: 'hidden' - this was blocking mobile scroll!
            // Each child component handles its own overflow
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          {/* Header — slides down into place first */}
          <Box sx={{
            '@keyframes slideDownFade': {
              '0%': { opacity: 0, transform: 'translateY(-8px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
            animation: 'slideDownFade 0.4s cubic-bezier(0, 0, 0.2, 1) both',
          }}>
            <Header
              moodleContext={state.moodleContext}
              onOpenPluginFeedback={handleOpenPluginFeedbackModal}
              creditBadge={
                <CreditPill
                  availableBalance={availableBalance}
                  hasWallet={hasWallet}
                  loading={creditLoading}
                  isMobile={isMobile}
                />
              }
            />
          </Box>

          {/* Main Content - Takes remaining space after Header */}
          <Box sx={{
            flex: 1,
            width: '100%',
            minHeight: 0, // Important: allows flex child to shrink below content size
            overflow: 'auto', // Enable scrolling here instead of blocking it at parent
          }}>
            <MainLayout
              state={state}
              dispatch={dispatch}
              onOpenSourcesModal={handleOpenSourcesModal}
              onOpenCurriculumModal={handleOpenCurriculumModal}
              onOpenVideoModal={handleOpenVideoLectureModal}
              onApproveSlides={handleOpenApproveConfirmation}
              onClosePreview={handleCloseReview}
              onOpenFeedbackModal={handleOpenFeedbackModal}
              onPublishContent={handlePublishContent}
              onUnpublishContent={handleUnpublishContent}
              onClearAllContent={handleClearAllContent}
              onDeleteContent={handleDeleteContent}
              isLoadingContent={isLoadingContent}
              hasCredits={hasCredits}
              creditTooltip={creditTooltip}
            />
          </Box>

          {/* Modals */}
          {state.showSourcesModal && (
            <SourcesModal
              open={state.showSourcesModal}
              onClose={handleCloseSourcesModal}
              moodleContext={state.moodleContext}
              refreshCredits={refreshCredits}
            />
          )}

          {state.showCurriculumModal && (
            <CurriculumModal
              open={state.showCurriculumModal}
              onClose={handleCloseCurriculumModal}
              onGenerate={handleGenerateSlides}
              moodleContext={state.moodleContext}
              availableBalance={availableBalance}
            />
          )}

          <VideoLectureModal
            open={state.showVideoLectureModal}
            onClose={() => dispatch({ type: 'SHOW_VIDEO_LECTURE_MODAL', payload: false })}
            onGenerate={handleGenerateVideoLecture}
            contentItems={state.contentItems}

          />

          {state.showPluginFeedbackModal && (
            <PluginFeedbackModal
              open={state.showPluginFeedbackModal}
              onClose={handleClosePluginFeedbackModal}
              currentView={state.currentContentId ? 'Content Preview' : 'Content List'}
              recentError={state.contentItems.find(item => item.status === 'error')?.errormessage || undefined}
              onSubmit={async (feedback: PluginFeedback) => {
                try {
                  // Ensure moodleContext is available
                  if (!state.moodleContext) {
                    showNotification('Session error. Please refresh the page.', 'error');
                    return;
                  }

                  // Create FormData for multipart upload (supports file upload)
                  const formData = new FormData();

                  // Add user and owner IDs
                  formData.append('user_id', state.moodleContext.userid.toString());
                  formData.append('owner_id', state.moodleContext.orgid ?? '');

                  // Add feedback data
                  formData.append('issue_types', JSON.stringify(feedback.selectedCategories));
                  formData.append('issue_description', feedback.additionalDetails);

                  // Add screenshot if present
                  if (feedback.attachments && feedback.attachments.length > 0) {
                    formData.append('screenshot', feedback.attachments[0]);
                  }

                  // Make API call
                  const response = await apiFetch(
                    `${state.moodleContext.wwwroot}/local/arina_prism_sense/api/save_plugin_feedback.php?sesskey=${state.moodleContext.sesskey}`,
                    {
                      method: 'POST',
                      body: formData,
                      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
                    }
                  );

                  const result = await response.json();

                  if (result.success) {
                    showNotification('Thank you for your feedback! We\'ll use it to improve PRISM.', 'success');
                  } else {
                    console.error('Failed to save feedback:', result.error);
                    showNotification('Failed to submit feedback. Please try again.', 'error');
                  }
                } catch (error) {
                  if (error instanceof SessionExpiredError) { return; }
                  console.error('Error submitting feedback:', error);
                  showNotification('An error occurred while submitting feedback.', 'error');
                }
              }}
            />
          )}

          {state.showFeedbackModal && (
            <ContentFeedbackModal
              open={state.showFeedbackModal}
              onClose={handleCloseFeedbackModal}
              contentId={state.currentContentId}
              availableBalance={availableBalance}
              videoLength={
                (() => {
                  const currentItem = state.contentItems.find(item => item.id === state.currentContentId);
                  return currentItem?.video_length ||
                    (currentItem?.generationdata ? JSON.parse(currentItem.generationdata).video_length : undefined) ||
                    '30';
                })()
              }
              onSubmitFeedback={async (feedback: ContentFeedbackData) => {
                // Save structured feedback to database
                if (state.currentContentId && state.moodleContext) {
                  try {
                    // Find the current content item to get metadata for regeneration
                    const currentItem = state.contentItems.find(item => item.id === state.currentContentId);

                    const response = await apiFetch(
                      `${state.moodleContext.wwwroot}/local/arina_prism_sense/api/save_content_feedback.php?sesskey=${state.moodleContext.sesskey}`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          contentid: state.currentContentId,
                          topics_needing_depth: feedback.topicsNeedingDepth,
                          topics_overexplained: feedback.topicsOverExplained,
                          extra_topics: feedback.extraTopics,
                          missing_subtopics: feedback.missingSubtopics,
                          reordered_flow: feedback.reorderedTopicFlow,
                          selected_categories: feedback.selectedCategories,
                          // Pass video_length so PHP can map it to mode (Express/Standard/Extensive/Deep Dive)
                          video_length: currentItem?.video_length
                            ?? (currentItem?.generationdata ? JSON.parse(currentItem.generationdata).video_length : undefined),
                          sesskey: state.moodleContext.sesskey,
                        }),
                      }
                    );
                    const result = await response.json();

                    if (result.success && result.feedback_id && currentItem) {
                      // Trigger regeneration with feedback linked
                      const generationData = currentItem.generationdata ? JSON.parse(currentItem.generationdata) : {};

                      // Pass the exact regen_count of the slide being replaced so the
                      // backend writes into the same Azure folder (overwrite, not new folder).
                      const parentRegenCount: number = generationData.regen_count ?? 0;

                      handleGenerateSlides(
                        {} as any, // Curriculum fetched by backend from section
                        generationData.content_strategy || 'standard',
                        currentItem.sectionid,
                        generationData.video_length || '30',
                        {
                          parentContentId: state.currentContentId ?? undefined,
                          feedbackId: result.feedback_id,
                          feedbackData: feedback,   // raw feedback for generate_pptx
                          regenCount: parentRegenCount, // overwrite same Azure folder
                        }
                      );
                    } else if (!result.success) {
                      console.error('Failed to save feedback:', result.error);
                      showNotification('Failed to save feedback.', 'error');
                    }
                  } catch (error) {
                    if (error instanceof SessionExpiredError) { return; }
                    console.error('Error in feedback submission flow:', error);
                    showNotification('Error processing feedback.', 'error');
                  }
                }
                handleCloseFeedbackModal();
              }}
            />
          )}

          {/* Approve Confirmation Dialog */}
          <Dialog
            open={showApproveConfirmation}
            onClose={handleCloseApproveConfirmation}
            fullScreen={isMobile}
            sx={{ zIndex: 100005 }}
            PaperProps={{
              sx: {
                borderRadius: isMobile ? 0 : '12px',
                width: { xs: '100%', sm: '420px' },
                maxWidth: { xs: '100%', sm: '420px' },
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
              Approve Content?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ color: 'text.secondary' }}>
                Are you sure you want to approve this content? This action cannot be undone. Once approved, you will not be able to regenerate this content.
              </DialogContentText>
            </DialogContent>
            <DialogActions
              sx={{
                px: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 },
                gap: 1,
                flexDirection: { xs: 'column-reverse', sm: 'row' },
              }}
            >
              <Button
                onClick={handleCloseApproveConfirmation}
                variant="outlined"
                fullWidth={isMobile}
                sx={{
                  fontWeight: 600,
                  borderWidth: 2,
                  minHeight: { xs: '48px', sm: 'auto' },
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApprove}
                variant="contained"
                color="success"
                fullWidth={isMobile}
                sx={{
                  fontWeight: 600,
                  minHeight: { xs: '48px', sm: 'auto' },
                  background: 'linear-gradient(135deg, #28A745 0%, #218838 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                    boxShadow: '0 6px 20px rgba(40, 167, 69, 0.4)',
                  },
                }}
              >
                Approve
              </Button>
            </DialogActions>
          </Dialog>

          {/* Notification Snackbar */}
          <Snackbar
            open={notification.open}
            autoHideDuration={6000}
            onClose={closeNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{
              '& .MuiAlert-root': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
            }}
          >
            <Alert
              onClose={closeNotification}
              severity={notification.severity}
              variant="filled"
              sx={{
                width: '100%',
                borderRadius: 2,
                '& .MuiAlert-action': {
                  paddingTop: 0,
                },
              }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export const init = (): void => {
  const container = document.getElementById('arina_prism_sense-react-root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error('LectureBot root element not found');
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'arina_prism_sense-react-root';
    document.body.appendChild(fallbackContainer);
    const root = createRoot(fallbackContainer);
    root.render(<App />);
  }
};