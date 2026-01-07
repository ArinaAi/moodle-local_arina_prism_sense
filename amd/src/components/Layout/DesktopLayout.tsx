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
}) => {
    // Handler for previewing content from the list (non-eye icon click)
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems
    });

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr) minmax(300px, 1fr)',
                gridTemplateRows: '1fr',
                gap: 2,
                p: 2,
                height: 'calc(100vh - 120px)',
                minHeight: '600px',
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
