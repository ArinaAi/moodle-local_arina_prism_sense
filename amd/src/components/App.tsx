
// App.tsx - Main entry point
import React, { useEffect, useReducer, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import '../types/window';
import MainLayout from './layout/MainLayout';
import SourcesModal from './modals/SourcesModal';
import CurriculumModal from './modals/CurriculumModal';
import FeedbackModal from './modals/FeedbackModal';

// Import refactored modules
import { theme } from '../theme/theme';
import { appReducer, initialState } from '../context/state';
import { ErrorBoundary } from './shared/ErrorBoundary';

import type { MoodleContext } from '../types/moodle';
import type { CurriculumStructure, ContentItem } from '../types/app';

// Initial state and Reducer moved to context/state.ts
// Theme moved to theme/theme.ts
// ErrorBoundary moved to shared/ErrorBoundary.tsx

// Type guard for lecture response (no longer used but kept for compatibility)
// const isGenerateLectureResponse = (data: unknown): data is GenerateLectureResponse => {
//   return (
//     typeof data === 'object' &&
//     data !== null &&
//     'status' in data &&
//     'results' in data &&
//     Array.isArray((data as GenerateLectureResponse).results)
//   );
// };

// Type guard for subtopic result (no longer used but kept for compatibility)
// const isSubtopicResult = (data: unknown): data is SubtopicResult => {
//   return (
//     typeof data === 'object' &&
//     data !== null &&
//     'topic' in data &&
//     typeof (data as SubtopicResult).topic === 'string' &&
//     'content' in data &&
//     Array.isArray((data as SubtopicResult).content)
//   );
// };


type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

/**
 * Merges server content with local generating items to handle DB lag
 */
const mergeContentItems = (serverContents: ContentItem[], localItems: ContentItem[]): ContentItem[] => {
  // SMART MERGE: Preserve local "generating" items if they are missing from server (DB lag)
  // This prevents the UI from potentially flickering or reverting to empty/ready state
  // if the poll executes before the synchronous generation script commits the new record.
  const mergedContents = [...serverContents];

  // Check if we have any local items that are 'generating' but missing from server response
  localItems.forEach(localItem => {
    // Only care about our temporary local items
    if (localItem.status === 'generating') {
      // Check if this EXACT item ID exists in server (unlikely for temp items)
      const exactMatch = serverContents.some(serverItem => serverItem.id === localItem.id);

      // CRITICAL: Check if the server already has a NEWER item for this section.
      // If the server knows about this section being generated (or ready), we should ONLY
      // drop the temp duplicate if the server item is RECENT (created after our request).
      // This prevents old 'ready' items from overwriting our new 'generating' state.
      const serverHasSectionUpdate = serverContents.some(serverItem =>
        String(serverItem.sectionid) === String(localItem.sectionid) &&
        (
          // It's the new generating item (status matches)
          serverItem.status === 'generating' ||
          // OR it's a new ready item (created on/after we clicked)
          // We give a 5-second buffer for clock skew
          (serverItem.status === 'ready' && serverItem.timecreated >= localItem.timecreated - 5)
        )
      );

      if (!exactMatch && !serverHasSectionUpdate) {
        // It's truly missing! (DB lag or just created). Preserve it.
        // eslint-disable-next-line no-console
        console.log('🛡️ Preserving local generating item missing from server:', localItem.sectionname);
        mergedContents.push(localItem);
      } else {
        // Server has caught up (has a NEW item for this section), so we can safely drop the local temp item
        // and let the server item take over.
        // eslint-disable-next-line no-console
        console.log('🔄 Server caught up for section:', localItem.sectionname, '- dropping temp item');
      }
    }
  });

  return mergedContents;
};

/**
 * Process notifications for newly ready items
 */
const processNotifications = (
  mergedContents: ContentItem[],
  previousContentIds: Set<string>,
  hasLoadedInitialContent: boolean,
  localItems: ContentItem[],
  dispatch: React.Dispatch<any>,
  showNotification: (msg: string, severity: NotificationSeverity) => void
): Set<string> => {
  const currentReadyIds = new Set<string>();

  mergedContents.forEach((content: ContentItem) => {
    if (content.status === 'ready') {
      const contentKey = `${content.id}-${content.status}`;
      currentReadyIds.add(contentKey);

      // Only notify if this is newly ready (not in previous state)
      // AND if we have finished initial load (so we don't notify on page reload)
      if (hasLoadedInitialContent && !previousContentIds.has(contentKey)) {
        // eslint-disable-next-line no-console
        console.log('🎉 Newly ready content detected:', content.sectionname);
        showNotification(`Slides for "${content.sectionname}" are ready!`, 'success');

        // Instant auto-preview ONLY if it matches a section we were waiting for (generating)
        // This prevents auto-previewing old/ghost content that might reappear
        const wasGeneratingLocal = localItems.some(localItem =>
          String(localItem.sectionid) === String(content.sectionid) &&
          localItem.status === 'generating'
        );

        if (content.result && wasGeneratingLocal) {
          dispatch({ type: 'SET_GENERATED_CONTENT', payload: content.result });
          dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: content.id });
          dispatch({ type: 'SET_SLIDES_APPROVED', payload: content.approved || false });
        }
      }
    }
  });

  return currentReadyIds;
};

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [notification, setNotification] = useState<{
    message: string;
    severity: NotificationSeverity;
    open: boolean;
  }>({
    message: '',
    severity: 'info',
    open: false,
  });
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [previousContentIds, setPreviousContentIds] = useState<Set<string>>(new Set());


  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);

  // Show notification
  const showNotification = useCallback((message: string, severity: NotificationSeverity) => {
    setNotification({ message, severity, open: true });
  }, []);

  // Initialize Moodle context
  useEffect(() => {
    const getMoodleContext = (): MoodleContext => {
      const context = window.MOODLE_CONTEXT;
      if (!context) {
        throw new Error('Moodle context not found');
      }
      return context;
    };

    try {
      const context = getMoodleContext();
      dispatch({ type: 'SET_MOODLE_CONTEXT', payload: context });
    } catch (error) {
      console.error('Failed to get Moodle context:', error);
      showNotification('Failed to load Moodle context. Please refresh the page.', 'error');
    }
  }, [showNotification]);

  // Listen for preview events from RightColumn
  useEffect(() => {
    const handlePreview = (event: CustomEvent) => {
      // eslint-disable-next-line no-console
      console.log('🎬 Preview event received!', event.detail);
      const contentItem = event.detail?.contentItem as ContentItem;
      // eslint-disable-next-line no-console
      console.log('🎬 ContentItem:', contentItem?.id, 'has result:', !!contentItem?.result);
      if (contentItem?.result) {
        // eslint-disable-next-line no-console
        console.log('🎬 Setting generated content for preview');
        // Set the generated content for preview
        dispatch({ type: 'SET_GENERATED_CONTENT', payload: contentItem.result });
        dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: contentItem.id });
        // Respect the approval status from the database
        dispatch({ type: 'SET_SLIDES_APPROVED', payload: contentItem.approved || false });
        showNotification('Content loaded for preview', 'info');
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ Preview event has no result data');
      }
    };

    window.addEventListener('lecturebot:preview', handlePreview as EventListener);
    return () => {
      window.removeEventListener('lecturebot:preview', handlePreview as EventListener);
    };
  }, [showNotification]);

  // Load content state from database
  const loadContentState = useCallback(async (showSpinner = true) => {
    if (!state.moodleContext) {
      return;
    }

    if (showSpinner) {
      setIsLoadingContent(true);
    }
    try {
      const response = await fetch(
        `${state.moodleContext.wwwroot}/local/lecturebot/api/get_content_state.php?courseid=${state.moodleContext.courseid}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();


      if (data.success && data.contents) {
        dispatch({ type: 'SET_CONTENT_ITEMS', payload: data.contents });

        // populate previousContentIds with currently ready items to prevent "newly ready" notifications
        // for items that were already ready on load
        if (showSpinner) {
          const readyIds = new Set<string>();
          data.contents.forEach((content: ContentItem) => {
            if (content.status === 'ready') {
              readyIds.add(`${content.id} -${content.status} `);
            }
          });
          setPreviousContentIds(readyIds);
          setHasLoadedInitialContent(true);
        }
      }
    } catch (error) {
      console.error('Failed to load content state:', error);
    } finally {
      if (showSpinner) {
        setIsLoadingContent(false);
      }
    }
  }, [state.moodleContext]);

  // Load content state when moodleContext is available
  useEffect(() => {
    if (state.moodleContext) {
      loadContentState();
    }
  }, [state.moodleContext, loadContentState]);

  // Poll for generating content status - ONLY when there's generating content
  const processPollData = useCallback((serverContents: ContentItem[]) => {
    // Log detailed info about each item's status
    // eslint-disable-next-line no-console
    console.log('Poll received data:', serverContents.length, 'items');

    const mergedContents = mergeContentItems(serverContents, state.contentItems);

    // Check for newly ready items and notify
    const currentReadyIds = processNotifications(
      mergedContents,
      previousContentIds,
      hasLoadedInitialContent,
      state.contentItems,
      dispatch,
      showNotification
    );

    // Update previous state
    setPreviousContentIds(currentReadyIds);

    // Always update the content items state with the MERGED list
    // eslint-disable-next-line no-console
    console.log('✅ Dispatching SET_CONTENT_ITEMS with', mergedContents.length, 'items');
    dispatch({ type: 'SET_CONTENT_ITEMS', payload: mergedContents });
  }, [state.contentItems, previousContentIds, showNotification, hasLoadedInitialContent]);

  // Poll for generating content status - ONLY when there's generating content
  useEffect(() => {
    if (!state.moodleContext) {
      return;
    }

    // Check if there's any generating content
    const hasGeneratingContent = state.contentItems.some(item => item.status === 'generating');

    if (!hasGeneratingContent) {
      // eslint-disable-next-line no-console
      console.log('⏸️ No generating content, polling paused');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('▶️ Generating content detected, starting polling');

    const pollInterval = setInterval(async () => {
      if (!state.moodleContext) {
        return;
      }

      try {
        // eslint-disable-next-line no-console
        console.log('🔍 Polling check_status.php...');

        const response = await fetch(
          `${state.moodleContext.wwwroot}/local/lecturebot/api/check_status.php?courseid=${state.moodleContext.courseid}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data = await response.json();

        // eslint-disable-next-line no-console
        console.log('📥 Poll response:', data);

        if ((data.success || data.status === 'success') && data.contents) {
          processPollData(data.contents);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [state.moodleContext, state.contentItems, processPollData]);

  // Handler functions
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

  // Source management now handled internally in SourcesModal
  // const handleAddSource = useCallback((source: Source) => {
  //   dispatch({ type: 'ADD_SOURCE', payload: source });
  //   showNotification('Source added successfully', 'success');
  // }, [showNotification]);

  // Source removal also handled in SourcesModal now
  // const handleRemoveSource = useCallback((sourceId: string) => {
  //   dispatch({ type: 'REMOVE_SOURCE', payload: sourceId });
  //   const remainingSources = state.sources.filter(s => s.id !== sourceId);
  //   if (remainingSources.length === 0) {
  //     dispatch({ type: 'SET_GENERATED_SLIDES', payload: null });
  //     dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
  //     dispatch({ type: 'SET_CURRICULUM', payload: null });
  //     dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });
  //     showNotification('Source removed. Generated content cleared.', 'info');
  //   } else {
  //     showNotification('Source removed', 'info');
  //   }
  // }, [state.sources, showNotification]);

  const handleGenerateSlides = useCallback(async (
    curriculum: CurriculumStructure,
    contentStrategy: 'standard' | 'example_driven',
    sectionId: number,
    videoLength: string
  ) => {
    if (!state.moodleContext) {
      showNotification('Moodle context not available', 'error');
      return;
    }

    // Get section name
    const section = state.moodleContext.sections.find(s => s.id === sectionId);
    const sectionName = section?.name || `Section ${section?.section || ''} `;

    // Show started notification immediately for UX
    showNotification(`Generation started for "${sectionName}"...`, 'info');

    // Create a temporary content item immediately for instant UI feedback
    const tempContentItem: ContentItem = {
      id: Date.now(), // Temporary ID
      sectionid: sectionId,
      sectionname: sectionName,
      contenttype: 'slide-deck',
      status: 'generating' as const,
      title: `Slides: ${sectionName} `,
      errormessage: null,
      timecreated: Math.floor(Date.now() / 1000),
      timemodified: Math.floor(Date.now() / 1000),
      timepublished: null,
      cmid: null,
      result: null,
      approved: false,
      approvedby: null,
      timeapproved: null,
      approver: null,
    };

    // Add temporary item to the UI immediately
    dispatch({
      type: 'SET_CONTENT_ITEMS',
      payload: [...state.contentItems, tempContentItem]
    });

    // Store curriculum and content strategy
    dispatch({ type: 'SET_CURRICULUM', payload: curriculum });
    dispatch({ type: 'SET_CONTENT_STRATEGY', payload: contentStrategy });
    dispatch({ type: 'SET_GENERATING_SLIDES', payload: true });

    // Clear previous generated content to show loading state
    dispatch({ type: 'SET_GENERATED_SLIDES', payload: null });
    dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
    dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
    dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 900000);

    try {
      // Use generate_content.php for real backend integration
      const proxyUrl = `${state.moodleContext.wwwroot}/local/lecturebot/api/generate_content.php?courseid=${state.moodleContext.courseid}&sesskey=${state.moodleContext.sesskey}`;

      const requestBody = {
        section_id: sectionId,
        content_strategy: contentStrategy,
        video_length: videoLength,
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        credentials: 'include',
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Generation failed: ${response.status} `);
        } catch (parseError) {
          throw new Error(`Generation failed: ${response.status} - ${errorText.substring(0, 200)} `);
        }
      }

      const responseText = await response.text();

      console.log('🔍 Generate content response:', responseText.substring(0, 500));

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', responseText.substring(0, 500));
        throw new Error('Server returned invalid JSON. Check PHP error logs.');
      }

      console.log('📦 Parsed result:', result);

      if (result.status === 'success' && result.content_id) {
        console.log('✅ Generation successful, content_id:', result.content_id);
        showNotification(`Generation Successful! for "${sectionName}"`, 'info');
        dispatch({ type: 'SET_GENERATING_SLIDES', payload: false });

        // Reload content state silently to replace temp item with real data
        console.log('🔄 Calling loadContentState (silent)...');
        await loadContentState(false);
        console.log('✅ loadContentState completed');
      } else {
        throw new Error(result.error || 'Invalid response from server');
      }

    } catch (error) {
      console.error('Slide generation error:', error);
      showNotification(`Error generating slides: ${(error as Error).message} `, 'error');
      // Remove temp item on error
      await loadContentState();
    } finally {
      dispatch({ type: 'SET_GENERATING_SLIDES', payload: false });
    }
  }, [state.moodleContext, state.contentItems, showNotification, loadContentState]);

  const handleApproveSlides = useCallback(async () => {
    if (!state.moodleContext || !state.currentContentId) {
      showNotification('No content to approve', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${state.moodleContext.wwwroot}/local/lecturebot/api/approve_content.php?contentid=${state.currentContentId}&courseid=${state.moodleContext.courseid}&sesskey=${state.moodleContext.sesskey}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const result = await response.json();

      if (result.success) {
        dispatch({ type: 'SET_SLIDES_APPROVED', payload: true });
        showNotification(
          `Content approved by ${result.approver.fullname} `,
          'success'
        );

        // Reload content state to update approval status in the list
        await loadContentState();
      } else {
        throw new Error(result.error || 'Failed to approve content');
      }
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(`Error approving content: ${(error as Error).message} `, 'error');
    }
  }, [state.moodleContext, state.currentContentId, showNotification, loadContentState]);

  const handleClosePreview = useCallback(() => {
    dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
    dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
    dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });
    showNotification('Preview closed', 'info');
  }, [showNotification]);

  const handleClearAllContent = useCallback(async () => {
    if (!state.moodleContext) {
      showNotification('Moodle context not available', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${state.moodleContext.wwwroot}/local/lecturebot/api/cleanup_content.php?courseid=${state.moodleContext.courseid}&sesskey=${state.moodleContext.sesskey}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse cleanup response:', responseText);
        throw new Error('Server returned invalid JSON');
      }

      if (result.success) {
        dispatch({ type: 'SET_CONTENT_ITEMS', payload: [] });
        showNotification('All content cleared successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to clear content');
      }
    } catch (error) {
      console.error('Clear content error:', error);
      showNotification(`Error clearing content: ${(error as Error).message} `, 'error');
    }
  }, [state.moodleContext, showNotification]);

  const handleDeleteContent = useCallback(async (contentId: number) => {
    if (!state.moodleContext) {
      showNotification('Moodle context not available', 'error');
      return;
    }

    try {
      const response = await fetch(
        `${state.moodleContext.wwwroot}/local/lecturebot/api/delete_content.php?contentid=${contentId}&sesskey=${state.moodleContext.sesskey}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const result = await response.json();

      if (result.status === 'success') {
        // Remove from state
        const updatedItems = state.contentItems.filter(item => item.id !== contentId);
        dispatch({ type: 'SET_CONTENT_ITEMS', payload: updatedItems });

        showNotification('Content deleted. Azure files preserved for restoration.', 'success');
      } else {
        throw new Error(result.error || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Delete content error:', error);
      showNotification(`Error deleting content: ${(error as Error).message} `, 'error');
    }
  }, [state.moodleContext, state.contentItems, showNotification]);

  const handlePublishContent = useCallback(async (contentId: string) => {
    // Extract numeric ID from "content-123" format
    const numericId = contentId.startsWith('content-')
      ? parseInt(contentId.replace('content-', ''), 10)
      : null;

    if (!numericId || !state.moodleContext) {
      showNotification('Invalid content ID', 'error');
      return;
    }

    // Find the content item - convert item.id to number for comparison
    const contentItem = state.contentItems.find(item => Number(item.id) === numericId);

    if (!contentItem) {
      showNotification('Content not found', 'error');
      return;
    }

    if (!contentItem.approved) {
      showNotification('Content must be approved before publishing', 'warning');
      return;
    }

    if (contentItem.status === 'published') {
      showNotification('Content is already published', 'warning');
      return;
    }

    try {
      // Show loading notification
      showNotification(`Publishing to ${contentItem.sectionname}...`, 'info');

      // Call publish API with the original section ID from generation
      const apiUrl = `${state.moodleContext.wwwroot}/local/lecturebot/api/publish_content.php?sesskey=${state.moodleContext.sesskey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseid: state.moodleContext.courseid,
          sectionid: contentItem.sectionid,
          contentid: numericId,
          title: contentItem.title,
          content: contentItem.result,
          type: contentItem.contenttype,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to publish content: ${errorText} `);
      }

      const result = await response.json();

      // Update the content item in local state to mark it as published
      const updatedItems = state.contentItems.map(item => {
        if (Number(item.id) === numericId) {
          return {
            ...item,
            status: 'published' as const,
            timepublished: Math.floor(Date.now() / 1000),
            cmid: result.moduleid || null,
          };
        }
        return item;
      });

      dispatch({ type: 'SET_CONTENT_ITEMS', payload: updatedItems });

      showNotification('Content published successfully!', 'success');
    } catch (error) {
      console.error('Error publishing content:', error);
      showNotification('Failed to publish content. Please try again.', 'error');
    }
  }, [state.contentItems, state.moodleContext, showNotification]);



  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const getAutoHideDuration = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'error':
        return 8000;
      case 'success':
        return 4000;
      case 'warning':
      default:
        return 6000;
    }
  };

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
            minHeight: '80vh',
            width: '100%',
            maxWidth: '100vw',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Subtle gradient for glassmorphism
          }}
        >
          {/* Header */}
          <Box
            component="header"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight transparency
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => window.location.href = `${state.moodleContext?.wwwroot}/course/view.php?id=${state.moodleContext?.courseid}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
                title="Back to course"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f6cbf"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <Box>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 600,
                  }}
                >
                  {state.moodleContext.coursename}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  AI-Powered Lecture Builder
                </Typography>
              </Box>
            </Box>
            <Box
              component="img"
              src={`${state.moodleContext.wwwroot}/local/lecturebot/pix/arina-logo.png`}
              alt="Arina AI"
              sx={{
                height: 60,
                width: 'auto',
                objectFit: 'contain',
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          </Box>

          {/* Main Content */}
          <MainLayout
            state={state}
            dispatch={dispatch}
            onOpenSourcesModal={handleOpenSourcesModal}
            onOpenCurriculumModal={handleOpenCurriculumModal}
            onApproveSlides={handleApproveSlides}
            onClosePreview={handleClosePreview}
            onOpenFeedbackModal={handleOpenFeedbackModal}
            onPublishContent={handlePublishContent}
            onClearAllContent={handleClearAllContent}
            onDeleteContent={handleDeleteContent}
            isLoadingContent={isLoadingContent}
          />

          {/* Modals */}
          {state.showSourcesModal && state.moodleContext && (
            <SourcesModal
              open={state.showSourcesModal}
              onClose={handleCloseSourcesModal}
              moodleContext={state.moodleContext}
            />
          )}

          {state.showCurriculumModal && state.moodleContext && (
            <CurriculumModal
              open={state.showCurriculumModal}
              onClose={handleCloseCurriculumModal}
              onGenerate={handleGenerateSlides}
              moodleContext={state.moodleContext}
            />
          )}

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



          {/* Notification Snackbar */}
          <Snackbar
            open={notification.open}
            autoHideDuration={getAutoHideDuration(notification.severity)}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{
              '& .MuiAlert-root': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
            }}
          >
            <Alert
              onClose={handleCloseNotification}
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