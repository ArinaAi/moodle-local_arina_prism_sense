import { useEffect, Dispatch } from 'react';
import type { AppState, AppAction, ContentItem } from '../types/app';
import type { NotificationSeverity } from './useNotification';

// Helper to handle notifications and dispatching aut-preview
const updateContentItem = (
    updatedItem: ContentItem,
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
    if (updatedItem.status === 'ready') {
        showNotification(`Playback ready for "${updatedItem.sectionname}"`, 'success');
        if (updatedItem.result) {
            dispatch({ type: 'SET_GENERATED_CONTENT', payload: updatedItem.result });
            dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: updatedItem.id });
            dispatch({ type: 'SET_SLIDES_APPROVED', payload: updatedItem.approved || false });
        }
    } else if (updatedItem.status === 'error') {
        showNotification(`Generation failed for "${updatedItem.sectionname}"`, 'error');
    }
};

// Helper to process individual item updates
const processUpdate = (
    updatedItem: ContentItem,
    contentItems: ContentItem[],
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
): boolean => {
    const index = contentItems.findIndex((i) => i.id === updatedItem.id);
    if (index === -1) {
        return false;
    }

    const currentItem = contentItems[index];

    // Check if main status changed (generating -> ready/failed)
    const statusChanged = currentItem.status === 'generating' && updatedItem.status !== 'generating';

    // Check if processing_status changed (for progress updates)
    const processingStatusChanged = currentItem.processing_status !== updatedItem.processing_status;

    if (statusChanged || processingStatusChanged) {
        contentItems[index] = updatedItem;
        // Only call updateContentItem for completed items
        if (statusChanged) {
            updateContentItem(updatedItem, dispatch, showNotification);
        }
        return true;
    }

    return false;
};

// Helper to check for updates
const fetchStatusUpdates = async (
    generatingIds: number[],
    state: AppState,
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
    try {
        const idsParam = generatingIds.join(',');
        const response = await fetch(
            `${state.moodleContext!.wwwroot}/local/lecturebot/api/check_status.php?courseid=${state.moodleContext!.courseid}&ids=${idsParam}`,
            { method: 'GET', credentials: 'include' }
        );
        const data = await response.json();

        if (data.status === 'success' && data.contents) {
            const updates = data.contents as ContentItem[];
            const newContentItems = [...state.contentItems];
            let hasUpdates = false;

            updates.forEach((updatedItem) => {
                if (processUpdate(updatedItem, newContentItems, dispatch, showNotification)) {
                    hasUpdates = true;
                }
            });

            if (hasUpdates) {
                dispatch({ type: 'SET_CONTENT_ITEMS', payload: newContentItems });
            }
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Poll failed:', err);
    }
};

export const useContentPolling = (
    state: AppState,
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
    useEffect(() => {
        if (!state.moodleContext) {
            return;
        }

        const generatingItems = state.contentItems.filter((item) => item.status === 'generating');
        if (generatingItems.length === 0) {
            return;
        }

        const generatingIds = generatingItems.map((item) => item.id);

        const pollInterval = setInterval(() => {
            fetchStatusUpdates(generatingIds, state, dispatch, showNotification);
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [state.moodleContext, state.contentItems, dispatch, showNotification]);
};
