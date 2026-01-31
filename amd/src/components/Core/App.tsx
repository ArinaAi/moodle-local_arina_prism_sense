
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
import FeedbackModal from '../Modals/FeedbackModal';
import VideoLectureModal from '../Modals/VideoLectureModal';

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

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showApproveConfirmation, setShowApproveConfirmation] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Custom Hooks
  const { notification, showNotification, closeNotification } = useNotification();

  useMoodleContext(dispatch, showNotification);
  usePreviewListener(dispatch, showNotification);
  useContentPolling(state, dispatch, showNotification);

  const {
    isLoadingContent,
    loadContentState,
    handleGenerateSlides,
    handleGenerateVideoLecture,
    handleApproveSlides,
    handlePublishContent,
    handleClearAllContent,
    handleDeleteContent
  } = useContentActions(state, dispatch, showNotification);

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
          {/* Header */}
          <Header moodleContext={state.moodleContext} />

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
              onClearAllContent={handleClearAllContent}
              onDeleteContent={handleDeleteContent}
              isLoadingContent={isLoadingContent}
            />
          </Box>

          {/* Modals */}
          {state.showSourcesModal && (
            <SourcesModal
              open={state.showSourcesModal}
              onClose={handleCloseSourcesModal}
              moodleContext={state.moodleContext}
            />
          )}

          {state.showCurriculumModal && (
            <CurriculumModal
              open={state.showCurriculumModal}
              onClose={handleCloseCurriculumModal}
              onGenerate={handleGenerateSlides}
              moodleContext={state.moodleContext}
            />
          )}

          <VideoLectureModal
            open={state.showVideoLectureModal}
            onClose={() => dispatch({ type: 'SHOW_VIDEO_LECTURE_MODAL', payload: false })}
            onGenerate={handleGenerateVideoLecture}
            contentItems={state.contentItems}

          />

          {state.showFeedbackModal && (
            <FeedbackModal
              open={state.showFeedbackModal}
              onClose={handleCloseFeedbackModal}
              onSubmitFeedback={(_feedback) => {
                // Handle regenerate with feedback
                showNotification('Feedback submitted. Regenerating slides...', 'info');
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
  const container = document.getElementById('lecturebot-react-root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error('LectureBot root element not found');
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'lecturebot-react-root';
    document.body.appendChild(fallbackContainer);
    const root = createRoot(fallbackContainer);
    root.render(<App />);
  }
};