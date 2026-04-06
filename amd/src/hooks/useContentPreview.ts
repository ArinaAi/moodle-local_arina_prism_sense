import { useCallback } from 'react';
import type { ContentItem } from '../types/app';

interface UseContentPreviewProps {
    contentItems: ContentItem[];
    onAfterPreview?: () => void;
}

export const useContentPreview = ({ contentItems, onAfterPreview }: UseContentPreviewProps) => {
    const handlePreviewContent = useCallback((contentId: number) => {
        const item = contentItems.find(i => i.id === contentId);
        if (item && item.result) {
            // Dispatch the same event as the eye icon to ensure consistent behavior
            window.dispatchEvent(new CustomEvent('arina_prism_sense:preview', { detail: { contentItem: item } }));

            if (onAfterPreview) {
                onAfterPreview();
            }
        }
    }, [contentItems, onAfterPreview]);

    return { handlePreviewContent };
};
