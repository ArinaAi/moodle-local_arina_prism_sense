import { useEffect, Dispatch } from 'react';
import type { AppState, AppAction, ContentItem } from '../types/app';
import type { NotificationSeverity } from './useNotification';

export const useContentPolling = (
    state: AppState,
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
    const processItemUpdate = (updatedItem: ContentItem) => {
        // NOTIFICATIONS & PREVIEW LOGIC
        if (updatedItem.status === 'ready') {
            showNotification(`Playback ready for "${updatedItem.sectionname}"`, 'success');
            // Auto-preview Logic
            if (updatedItem.result) {
                dispatch({ type: 'SET_GENERATED_CONTENT', payload: updatedItem.result });
                dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: updatedItem.id });
                dispatch({ type: 'SET_SLIDES_APPROVED', payload: updatedItem.approved || false });
            }
        } else if (updatedItem.status === 'error') {
            showNotification(`Generation failed for "${updatedItem.sectionname}"`, 'error');
        }
    };

    const checkStatusUpdates = async (generatingIds: number[]) => {
        try {
            const idsParam = generatingIds.join(',');
            const response = await fetch(
                `${state.moodleContext!.wwwroot}/local/lecturebot/api/check_status.php?courseid=${state.moodleContext!.courseid}&ids=${idsParam}`,
                { method: 'GET', credentials: 'include' }
            );
            const data = await response.json();

            if (data.status === 'success' && data.contents) {
                const updates = data.contents as ContentItem[];
                let hasUpdates = false;
                const newContentItems = [...state.contentItems];

                updates.forEach((updatedItem) => {
                    const index = newContentItems.findIndex((i) => i.id === updatedItem.id);
                    if (index !== -1) {
                        const currentItem = newContentItems[index];
                        // Check if status changed from generating -> ready/error
                        if (currentItem.status === 'generating' && updatedItem.status !== 'generating') {
                            hasUpdates = true;
                            // Update item in place
                            newContentItems[index] = updatedItem;
                            processItemUpdate(updatedItem);
                        }
                    }
                });

                if (hasUpdates) {
                    console.log('✨ Polling found updates! Updating state...');
                    dispatch({ type: 'SET_CONTENT_ITEMS', payload: newContentItems });
                }
            }
        } catch (err) {
            console.error('Poll failed:', err);
        }
    };

    useEffect(() => {
        if (!state.moodleContext) {
            return;
        }

        // 1. Identify active jobs (generating items)
        const generatingItems = state.contentItems.filter((item) => item.status === 'generating');

        if (generatingItems.length === 0) {
            return;
        }

        // Collect IDs to poll
        const generatingIds = generatingItems.map((item) => item.id);

        const pollInterval = setInterval(() => {
            checkStatusUpdates(generatingIds);
        }, 5000); // Poll every 5s for faster feedback on active jobs

        return () => clearInterval(pollInterval);
    }, [state.moodleContext, state.contentItems, dispatch, showNotification]);
};
