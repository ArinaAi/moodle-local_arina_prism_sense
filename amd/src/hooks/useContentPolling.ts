import { useEffect, useRef, Dispatch } from 'react';
import type { AppState, AppAction, ContentItem } from '../types/app';
import type { NotificationSeverity } from './useNotification';

const POLL_INTERVAL_MS = 30000; // 30 seconds

// Helper to handle notifications and dispatching auto-preview
const updateContentItem = (
    updatedItem: ContentItem,
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void,
    refreshCredits?: () => void
) => {
    if (updatedItem.status === 'ready') {
        showNotification(`Playback ready for "${updatedItem.sectionname}"`, 'success');
        if (updatedItem.result) {
            dispatch({ type: 'SET_GENERATED_CONTENT', payload: updatedItem.result });
            dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: updatedItem.id });
            dispatch({ type: 'SET_SLIDES_APPROVED', payload: updatedItem.approved || false });
        }
        if (refreshCredits) {
            refreshCredits();
        }
    } else if (updatedItem.status === 'error') {
        const errorMsg = updatedItem.errormessage || 'Generation failed. Please try again.';
        showNotification(`Generation failed for "${updatedItem.sectionname}": ${errorMsg}`, 'error');
        if (refreshCredits) {
            refreshCredits();
        }
    }
};

// Helper to process individual item updates
const processUpdate = (
    updatedItem: ContentItem,
    contentItems: ContentItem[],
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void,
    refreshCredits?: () => void
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
            updateContentItem(updatedItem, dispatch, showNotification, refreshCredits);
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
    showNotification: (msg: string, severity: NotificationSeverity) => void,
    refreshCredits?: () => void
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

            // Track parent IDs to remove (old cards superseded by a ready regeneration)
            const parentIdsToRemove = new Set<number>();

            updates.forEach((updatedItem) => {
                if (processUpdate(updatedItem, newContentItems, dispatch, showNotification, refreshCredits)) {
                    hasUpdates = true;
                    // If this item just became ready AND is a regeneration, mark its parent for removal
                    const idx = newContentItems.findIndex((i) => i.id === updatedItem.id);
                    if (
                        idx !== -1 &&
                        newContentItems[idx].status === 'ready' &&
                        updatedItem.parent_content_id
                    ) {
                        parentIdsToRemove.add(updatedItem.parent_content_id);
                    }
                }
            });

            // Remove superseded parent cards from the list
            const filtered = parentIdsToRemove.size > 0
                ? newContentItems.filter((i) => !parentIdsToRemove.has(i.id))
                : newContentItems;

            if (hasUpdates || parentIdsToRemove.size > 0) {
                dispatch({ type: 'SET_CONTENT_ITEMS', payload: filtered });
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
    showNotification: (msg: string, severity: NotificationSeverity) => void,
    refreshCredits?: () => void
) => {
    // Keep refs so the interval callback always reads the latest values
    // without needing to restart the timer on every state change
    const stateRef = useRef(state);
    const showNotificationRef = useRef(showNotification);
    const refreshCreditsRef = useRef(refreshCredits);

    // Update refs on every render — no re-subscription needed
    useEffect(() => {
        stateRef.current = state;
        showNotificationRef.current = showNotification;
        refreshCreditsRef.current = refreshCredits;
    });

    // Derive a stable boolean: are there ANY generating items right now?
    // The interval only starts/stops based on this, NOT on which items changed.
    // This means multiple parallel generating slides are all polled together
    // in one call without the interval ever being reset mid-flight.
    const hasGeneratingItems = state.contentItems.some((item) => item.status === 'generating');

    useEffect(() => {
        if (!state.moodleContext || !hasGeneratingItems) {
            return;
        }

        const pollInterval = setInterval(() => {
            // Read fresh state from ref — avoids stale closure values
            const currentState = stateRef.current;
            const currentGeneratingItems = currentState.contentItems.filter(
                (item) => item.status === 'generating'
            );

            if (currentGeneratingItems.length === 0) {
                return; // All done, interval will be cleaned up on next render
            }

            // Poll ALL currently generating items in one request
            // This naturally supports multiple parallel slide generations
            const generatingIds = currentGeneratingItems.map((item) => item.id);
            fetchStatusUpdates(generatingIds, currentState, dispatch, showNotificationRef.current, refreshCreditsRef.current);
        }, POLL_INTERVAL_MS);

        return () => clearInterval(pollInterval);

        // Intentionally excludes state.contentItems from deps:
        // The ref keeps it fresh. We only restart when moodleContext changes
        // or when generating goes from zero → non-zero (hasGeneratingItems flips).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.moodleContext, hasGeneratingItems, dispatch]);
};
