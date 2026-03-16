import { useState, useCallback } from 'react';
import type { AppState, AppAction, CurriculumStructure, ContentItem } from '../types/app';
import type { NotificationSeverity } from './useNotification';

export const useContentActions = (
    state: AppState,
    dispatch: React.Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
    const [isLoadingContent, setIsLoadingContent] = useState(false);

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
            }
        } catch (error) {
            console.error('Failed to load content state:', error);
        } finally {
            if (showSpinner) {
                setIsLoadingContent(false);
            }
        }
    }, [state.moodleContext, dispatch]);

    const handleGenerateSlides = useCallback(async (
        curriculum: CurriculumStructure,
        contentStrategy: 'standard' | 'example_driven',
        sectionId: number,
        videoLength: string,
        parentContentId?: number,
        feedbackId?: number,
        feedbackData?: {
            topicsNeedingDepth: string[];
            topicsOverExplained: string[];
            extraTopics: string[];
            missingSubtopics: string[];
            reorderedTopicFlow: string[];
            selectedCategories: string[];
        }
    ) => {
        if (!state.moodleContext) {
            showNotification('Moodle context not available', 'error');
            return;
        }

        // Get section name
        const section = state.moodleContext.sections.find(s => s.id === sectionId);
        const sectionName = section?.name || `Section ${section?.section || ''} `;

        // Show started notification immediately for UX
        const notificationMsg = parentContentId
            ? `Regenerating "${sectionName}" based on feedback...`
            : `Generation started for "${sectionName}"...`;
        showNotification(notificationMsg, 'info');

        // Create a temporary content item immediately for instant UI feedback
        const tempContentItem: ContentItem = {
            id: Date.now(), // Temporary ID
            sectionid: sectionId,
            sectionname: sectionName,
            contenttype: 'slide-deck',
            status: 'generating' as const,
            title: parentContentId ? `Regenerating: ${sectionName}` : `Slides: ${sectionName} `,
            errormessage: null,
            timecreated: Math.floor(Date.now() / 1000),
            timemodified: Math.floor(Date.now() / 1000),
            timepublished: null,
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

        dispatch({ type: 'SET_GENERATING_SLIDES', payload: true });

        // Clear previous generated content to show loading state
        dispatch({ type: 'SET_GENERATED_SLIDES', payload: null });
        dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
        dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
        dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });

        try {
            // Use generate_content.php for real backend integration
            const proxyUrl = `${state.moodleContext.wwwroot}/local/lecturebot/api/generate_content.php?courseid=${state.moodleContext.courseid}&sesskey=${state.moodleContext.sesskey}`;

            const requestBody: Record<string, unknown> = {
                section_id: sectionId,
                content_strategy: contentStrategy,
                video_length: videoLength,
                parent_content_id: parentContentId,
                feedback_id: feedbackId,
            };

            // Pass raw feedback fields so generate_content.php can forward them
            // as feedback_json to generate_pptx (external service stores feedback,
            // so local DB lookup is not possible).
            if (feedbackData) {
                requestBody.feedback_topics_needing_depth  = feedbackData.topicsNeedingDepth;
                requestBody.feedback_topics_overexplained  = feedbackData.topicsOverExplained;
                requestBody.feedback_extra_topics          = feedbackData.extraTopics;
                requestBody.feedback_missing_subtopics     = feedbackData.missingSubtopics;
                requestBody.feedback_reordered_flow        = feedbackData.reorderedTopicFlow;
                requestBody.feedback_selected_categories   = feedbackData.selectedCategories;
            }

            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API key is missing or incorrect. Please check your settings.');
                }
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Generation failed: ${response.status} `);
                } catch (parseError) {
                    throw new Error(`Generation failed: ${response.status} - ${errorText.substring(0, 200)} `);
                }
            }

            const responseText = await response.text();
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
                dispatch({ type: 'SET_GENERATING_SLIDES', payload: false });

                // Reload content state silently to replace temp item with real data
                console.log('🔄 Calling loadContentState (silent)...');
                await loadContentState(false);
                console.log('✅ loadContentState completed');
            } else {
                throw new Error(result.error || 'Invalid response from server');
            }

        } catch (error: any) {
            console.error('Slide generation error:', error);
            const errorMsg = error?.message?.toLowerCase() || '';
            if (errorMsg.includes('api key') || errorMsg.includes('unauthorized') || errorMsg.includes('not configured')) {
                showNotification(error.message, 'error');
            } else if (errorMsg.includes('curriculum')) {
                showNotification('No curriculum found for this section. Please upload curriculum first.', 'error');
            } else {
                showNotification('Something went wrong while generating slides. Please try again.', 'error');
            }
            // Remove temp item from state directly (avoid loadContentState which triggers self-healing cleanup)
            dispatch({
                type: 'SET_CONTENT_ITEMS',
                payload: state.contentItems
            });
        } finally {
            dispatch({ type: 'SET_GENERATING_SLIDES', payload: false });
        }
    }, [state.moodleContext, state.contentItems, dispatch, showNotification, loadContentState]);

    const handleGenerateVideoLecture = async (
        contentId: number,
        contentStrategy: 'standard' | 'example_driven',
        language: 'en' | 'hi' | 'mr' | 'kn' | 'ta' | 'si',
        voiceGender: 'female' | 'male',
        avatarStrategy: 'none' | 'title_only'
    ) => {
        if (!state.moodleContext) {
            showNotification('Moodle context not available', 'error');
            return;
        }

        // Find the selected slide deck
        const slideItem = state.contentItems.find(item => item.id === contentId);
        if (!slideItem) {
            showNotification('Slide deck not found', 'error');
            return;
        }

        // Extract metadata from selected slide
        const sectionId = slideItem.sectionid;
        const sectionName = slideItem.sectionname;
        const generationData = slideItem.generationdata ? JSON.parse(slideItem.generationdata) : {};
        const regenCount = generationData.regen_count || 0;

        console.log(`🎥 Video generation for section ${sectionId}, regen_count: ${regenCount}`);

        // Close modal
        dispatch({ type: 'SHOW_VIDEO_LECTURE_MODAL', payload: false });

        // Set generating state
        dispatch({ type: 'SET_GENERATING_SLIDES', payload: true });

        // Clear previous content state
        dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
        dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
        dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });

        // Optimistic Update: Create a local "generating" item
        const tempId = Date.now();
        const tempItem: ContentItem = {
            id: tempId,
            sectionid: sectionId,
            sectionname: sectionName,
            contenttype: 'video',
            status: 'generating',
            title: `Video: ${sectionName}`,
            result: null,
            errormessage: null,
            timecreated: Math.floor(Date.now() / 1000),
            timemodified: Math.floor(Date.now() / 1000),
            timepublished: null,
            approved: false,
            approvedby: null,
            timeapproved: null,
            approver: null,
        };

        // Add to local items
        const newContentItems = [...state.contentItems, tempItem];
        dispatch({ type: 'SET_CONTENT_ITEMS', payload: newContentItems });

        showNotification(`Video generation started for "${sectionName}"...`, 'info');

        try {
            const response = await fetch(`${state.moodleContext.wwwroot}/local/lecturebot/api/generate_content.php?courseid=${state.moodleContext.courseid}&sesskey=${state.moodleContext.sesskey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    section_id: sectionId,
                    content_type: 'video',
                    source_content_id: contentId,
                    regen_count: regenCount,
                    content_strategy: contentStrategy,
                    language: language,
                    voice_gender: voiceGender,
                    avatar_strategy: avatarStrategy,
                }),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API key is missing or incorrect. Please check your settings.');
                }
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `Generation failed: ${response.status}`);
                } catch (parseError) {
                    throw new Error(`Generation failed: ${response.status} - ${errorText.substring(0, 200)}`);
                }
            }

            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.error);
            }

            // Reload content state silently to replace temp item with real data
            console.log('🔄 Calling loadContentState (silent) after video generation request...');
            await loadContentState(false);
            console.log('✅ loadContentState completed for video generation');

        } catch (error: any) {
            console.error('Video generation failed:', error);
            const videoErrorMsg = error?.message?.toLowerCase() || '';
            if (videoErrorMsg.includes('api key') || videoErrorMsg.includes('unauthorized') || videoErrorMsg.includes('not configured')) {
                showNotification(error.message, 'error');
            } else {
                showNotification('Something went wrong while generating the video. Please try again.', 'error');
            }
            // Remove temp item from state directly (avoid loadContentState which triggers self-healing cleanup)
            dispatch({
                type: 'SET_CONTENT_ITEMS',
                payload: state.contentItems
            });
        } finally {
            dispatch({ type: 'SET_GENERATING_SLIDES', payload: false });
        }
    };

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
        } catch (error: any) {
            console.error('Approval error:', error);
            const errorMsg = error?.message || 'Something went wrong while approving content. Please try again.';
            showNotification(errorMsg, 'error');
        }
    }, [state.moodleContext, state.currentContentId, dispatch, showNotification, loadContentState]);

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

            // Call simplified publish API
            const apiUrl = `${state.moodleContext.wwwroot}/local/lecturebot/api/publish_content.php?sesskey=${state.moodleContext.sesskey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseid: state.moodleContext.courseid,
                    contentid: numericId,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to publish content: ${errorText} `);
            }

            await response.json();

            // Update the content item in local state to mark it as published
            const updatedItems = state.contentItems.map(item => {
                if (Number(item.id) === numericId) {
                    return {
                        ...item,
                        status: 'published' as const,
                        timepublished: Math.floor(Date.now() / 1000),
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
    }, [state.contentItems, state.moodleContext, dispatch, showNotification]);

    const handleUnpublishContent = useCallback(async (contentId: string) => {
        // Extract numeric ID from "content-123" format
        const numericId = contentId.startsWith('content-')
            ? parseInt(contentId.replace('content-', ''), 10)
            : null;

        if (!numericId || !state.moodleContext) {
            showNotification('Invalid content ID', 'error');
            return;
        }

        // Find the content item
        const contentItem = state.contentItems.find(item => Number(item.id) === numericId);

        if (!contentItem) {
            showNotification('Content not found', 'error');
            return;
        }

        if (contentItem.status !== 'published') {
            showNotification('Content is not currently published', 'warning');
            return;
        }

        try {

            const apiUrl = `${state.moodleContext.wwwroot}/local/lecturebot/api/unpublish_content.php?sesskey=${state.moodleContext.sesskey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseid: state.moodleContext.courseid,
                    contentid: numericId,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to unpublish content: ${errorText} `);
            }

            await response.json(); // Parse response but don't use result

            // Update the content item in local state
            const updatedItems = state.contentItems.map(item => {
                if (Number(item.id) === numericId) {
                    return {
                        ...item,
                        status: 'ready' as const,
                        timepublished: null,
                    };
                }
                return item;
            });

            dispatch({ type: 'SET_CONTENT_ITEMS', payload: updatedItems });

            showNotification('Content unpublished successfully!', 'success');
        } catch (error) {
            console.error('Error unpublishing content:', error);
            showNotification('Failed to unpublish content. Please try again.', 'error');
        }
    }, [state.contentItems, state.moodleContext, dispatch, showNotification]);

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
            showNotification('Something went wrong while clearing content. Please try again.', 'error');
        }
    }, [state.moodleContext, dispatch, showNotification]);

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

                // Clear preview if the deleted item is currently being previewed
                if (state.currentContentId === contentId) {
                    dispatch({ type: 'SET_GENERATED_CONTENT', payload: null });
                    dispatch({ type: 'SET_GENERATED_SLIDES', payload: null });
                    dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: null });
                    dispatch({ type: 'SET_SLIDES_APPROVED', payload: false });
                }

                showNotification('Content deleted successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to delete content');
            }
        } catch (error) {
            console.error('Delete content error:', error);
            showNotification('Something went wrong while deleting content. Please try again.', 'error');
        }
    }, [state.moodleContext, state.contentItems, state.currentContentId, dispatch, showNotification]);

    return {
        isLoadingContent,
        loadContentState,
        handleGenerateSlides,
        handleGenerateVideoLecture,
        handleApproveSlides,
        handlePublishContent,
        handleUnpublishContent,
        handleClearAllContent,
        handleDeleteContent
    };
};
