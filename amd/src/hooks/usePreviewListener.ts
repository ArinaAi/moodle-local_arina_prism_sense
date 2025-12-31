import { useEffect, Dispatch } from 'react';
import type { AppAction, ContentItem } from '../types/app';
import type { NotificationSeverity } from './useNotification';

export const usePreviewListener = (
    dispatch: Dispatch<AppAction>,
    showNotification: (msg: string, severity: NotificationSeverity) => void
) => {
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
    }, [dispatch, showNotification]);
};
