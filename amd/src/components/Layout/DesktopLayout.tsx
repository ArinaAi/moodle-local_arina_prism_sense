import React from 'react';
import { Box } from '@mui/material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import RightColumn from '../RightColumn/RightColumn';
import { useContentPreview } from '../../hooks/useContentPreview';
import type { LayoutProps } from '../../types/layout';
import { KEYFRAMES, EASING } from '../../styles/animations';

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
    onUnpublishContent,
    onClearAllContent,
    onDeleteContent,
    isLoadingContent,
    isLargeDesktop = false,
    hasCredits,
    creditTooltip,
}) => {
    // Handler for previewing content from the list (non-eye icon click)
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems
    });

    return (
        <Box
            sx={{
                display: 'grid',
                // Responsive grid: give left column more room on smaller screens
                // Left: minimum 260px (enough for dock), can grow to 320px
                // Center: flexible, takes remaining space
                // Right: minimum 280px, can grow to 380px on large screens
                gridTemplateColumns: isLargeDesktop
                    ? 'minmax(320px, 1.2fr) minmax(500px, 2.5fr) minmax(340px, 1.3fr)'
                    : 'minmax(260px, 1fr) minmax(400px, 2fr) minmax(280px, 1fr)',
                gridTemplateRows: '1fr',
                gap: 'clamp(12px, 1.2vw, 20px)',
                p: 'clamp(12px, 1.2vw, 20px)',
                // Use 100% height and width
                height: '100%',
                width: '100%',
                minHeight: 0, // Allows shrinking in flex context
                overflow: 'hidden',
                alignItems: 'stretch',
            }}
        >
            {/* Left Column - enters first */}
            <Box sx={{
                height: '100%', minHeight: 0, overflow: 'auto',
                ...KEYFRAMES.slideUpFade,
                animation: `slideUpFade 0.5s ${EASING.decelerate} both`,
                animationDelay: '0.05s',
            }}>
                <LeftColumn
                    state={state}
                    onOpenSourcesModal={onOpenSourcesModal}
                    onOpenCurriculumModal={onOpenCurriculumModal}
                    onOpenVideoModal={onOpenVideoModal}
                    dispatch={dispatch}
                    hasCredits={hasCredits}
                    creditTooltip={creditTooltip}
                />
            </Box>

            {/* Center Column - enters second */}
            <Box sx={{
                height: '100%', minHeight: 0, overflow: 'auto',
                ...KEYFRAMES.slideUpFade,
                animation: `slideUpFade 0.5s ${EASING.decelerate} both`,
                animationDelay: '0.15s',
            }}>
                <CenterColumn
                    state={state}
                    onApproveSlides={onApproveSlides}
                    onClosePreview={onClosePreview}
                    onOpenFeedbackModal={onOpenFeedbackModal}
                    onOpenSourcesModal={onOpenSourcesModal}
                    hasAnySources={state.sources.length > 0}
                    hasCredits={hasCredits}
                />
            </Box>

            {/* Right Column - enters last */}
            <Box sx={{
                height: '100%', minHeight: 0, overflow: 'hidden',
                ...KEYFRAMES.slideUpFade,
                animation: `slideUpFade 0.5s ${EASING.decelerate} both`,
                animationDelay: '0.25s',
            }}>
                <RightColumn
                    state={{ contentItems: state.contentItems, moodleContext: state.moodleContext }}
                    onPublishContent={onPublishContent}
                    onUnpublishContent={onUnpublishContent}
                    onClearAll={onClearAllContent}
                    onDeleteContent={onDeleteContent}
                    isLoading={isLoadingContent}
                    onPreviewContent={handlePreviewContent}
                    fullHeight={true}
                />
            </Box>
        </Box>
    );
};

export default DesktopLayout;
