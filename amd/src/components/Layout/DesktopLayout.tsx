import React from 'react';
import { Box } from '@mui/material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import RightColumn from '../RightColumn/RightColumn';
import { useContentPreview } from '../../hooks/useContentPreview';
import type { LayoutProps } from '../../types/layout';

const DesktopLayout: React.FC<LayoutProps> = ({
    state,
    dispatch,
    onOpenSourcesModal,
    onOpenCurriculumModal,
    onOpenVideoModal,
    onApproveSlides,
    onClosePreview,
    onOpenFeedbackModal,
    onPublishContent,
    onClearAllContent,
    onDeleteContent,
    isLoadingContent,
    isLargeDesktop = false,
}) => {
    // Handler for previewing content from the list (non-eye icon click)
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems
    });

    return (
        <Box
            sx={{
                display: 'grid',
                // Responsive grid: side columns shrink on smaller desktops, expand on large screens
                gridTemplateColumns: isLargeDesktop
                    ? 'minmax(320px, 1.2fr) minmax(500px, 2.5fr) minmax(320px, 1.2fr)'
                    : 'clamp(260px, 20vw, 350px) 1fr clamp(260px, 20vw, 350px)',
                gridTemplateRows: '1fr',
                gap: 'clamp(16px, 1.5vw, 24px)',
                p: 'clamp(16px, 1.5vw, 24px)',
                // Use 100% height - parent controls actual size via flex layout
                height: '100%',
                minHeight: 0, // Allows shrinking in flex context
                overflow: 'hidden',
                alignItems: 'stretch',
            }}
        >
            {/* Left Column */}
            <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto' }}>
                <LeftColumn
                    state={state}
                    onOpenSourcesModal={onOpenSourcesModal}
                    onOpenCurriculumModal={onOpenCurriculumModal}
                    onOpenVideoModal={onOpenVideoModal}
                    dispatch={dispatch}
                />
            </Box>

            {/* Center Column */}
            <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto' }}>
                <CenterColumn
                    state={state}
                    onApproveSlides={onApproveSlides}
                    onClosePreview={onClosePreview}
                    onOpenFeedbackModal={onOpenFeedbackModal}
                    onOpenSourcesModal={onOpenSourcesModal}
                    hasAnySources={state.sources.length > 0}
                />
            </Box>

            {/* Right Column */}
            <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto' }}>
                <RightColumn
                    state={{ contentItems: state.contentItems }}
                    onPublishContent={onPublishContent}
                    onClearAll={onClearAllContent}
                    onDeleteContent={onDeleteContent}
                    isLoading={isLoadingContent}
                    onPreviewContent={handlePreviewContent}
                />
            </Box>
        </Box>
    );
};

export default DesktopLayout;
