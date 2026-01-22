import React from 'react';
import { Box } from '@mui/material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import RightColumn from '../RightColumn/RightColumn';
import { useContentPreview } from '../../hooks/useContentPreview';
import type { LayoutProps } from '../../types/layout';

const TabletLayout: React.FC<LayoutProps> = ({
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
    isSmallTablet = false,
}) => {
    // Handler for previewing content from the list (non-eye icon click)
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems
    });

    return (
        <Box
            sx={{
                display: 'grid',
                // Small tablets (600-900px): narrower left column
                // Large tablets (900-1200px): equal columns
                gridTemplateColumns: isSmallTablet ? 'minmax(200px, 0.8fr) 1fr' : '1fr 1fr',
                gridTemplateRows: '1fr',
                gap: 'clamp(12px, 1.5vw, 16px)',
                p: 'clamp(12px, 1.5vw, 16px)',
                // Use 100% height - parent controls actual size via flex layout
                height: '100%',
                minHeight: 0, // Allows shrinking in flex context
                overflow: 'hidden',
                alignItems: 'stretch',
            }}
        >
            {/* Left Column */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'auto',
            }}>
                <LeftColumn
                    state={state}
                    onOpenSourcesModal={onOpenSourcesModal}
                    onOpenCurriculumModal={onOpenCurriculumModal}
                    onOpenVideoModal={onOpenVideoModal}
                    dispatch={dispatch}
                    isMobile={isSmallTablet} // Use mobile styling on small tablets
                />
            </Box>

            {/* Right Column (stacked Center + Right) */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                gap: 'clamp(12px, 1.5vw, 16px)',
                minHeight: 0,
            }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'auto' }}>
                    <CenterColumn
                        state={state}
                        onApproveSlides={onApproveSlides}
                        onClosePreview={onClosePreview}
                        onOpenFeedbackModal={onOpenFeedbackModal}
                        onOpenSourcesModal={onOpenSourcesModal}
                        hasAnySources={state.sources.length > 0}
                        isMobile={isSmallTablet} // Use mobile styling on small tablets
                    />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <RightColumn
                        state={{ contentItems: state.contentItems }}
                        onPublishContent={onPublishContent}
                        onClearAll={onClearAllContent}
                        onDeleteContent={onDeleteContent}
                        isLoading={isLoadingContent}
                        onPreviewContent={handlePreviewContent}
                        isMobile={isSmallTablet} // Use mobile styling on small tablets
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default TabletLayout;
