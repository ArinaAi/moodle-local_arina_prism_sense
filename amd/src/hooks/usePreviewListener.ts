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
                console.log('🎬 Getting Content Type:', contentItem.contenttype);

                // Determine content type to switch to
                const contentType = contentItem.contenttype === 'video' ? 'video' : 'slide-deck';

                // eslint-disable-next-line no-console
                console.log('Setting generated content for preview. Type:', contentType);

                // Update active content type first to ensure UI switches mode
                dispatch({ type: 'SET_ACTIVE_CONTENT_TYPE', payload: contentType });

                // Set the generated content for preview
                dispatch({ type: 'SET_GENERATED_CONTENT', payload: contentItem.result });
                dispatch({ type: 'SET_CURRENT_CONTENT_ID', payload: contentItem.id });
                // Respect the approval status from the database
                dispatch({ type: 'SET_SLIDES_APPROVED', payload: contentItem.approved || false });

                showNotification(`Previewing ${contentType === 'video' ? 'video' : 'slides'}...`, 'info');
            } else {
                // eslint-disable-next-line no-console
                console.error('❌ Preview event has no result data');
            }
        };

        window.addEventListener('arina_prism_sense:preview', handlePreview as EventListener);
        return () => {
            window.removeEventListener('arina_prism_sense:preview', handlePreview as EventListener);
        };
    }, [dispatch, showNotification]);
};
