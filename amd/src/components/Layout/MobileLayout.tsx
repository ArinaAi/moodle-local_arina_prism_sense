import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import RightColumn from '../RightColumn/RightColumn';
import { useContentPreview } from '../../hooks/useContentPreview';
import type { LayoutProps } from '../../types/layout';

const MobileLayout: React.FC<LayoutProps> = ({
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
    hasCredits,
    creditTooltip,
}) => {
    const [activeTab, setActiveTab] = useState<'sources' | 'content' | 'publish'>('content');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: 'sources' | 'content' | 'publish') => {
        setActiveTab(newValue);
    };

    // Handler for previewing content from the list (non-eye icon click)
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems,
        onAfterPreview: () => setActiveTab('content')
    });

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                // Use 100% height - parent container controls the actual size
                // This is better than hardcoding calc(100dvh - 60px) which assumed header height
                height: '100%',
                minHeight: 0, // Allows shrinking in flex context
                backgroundColor: 'background.default',
                // Safe area padding for notched devices (iPhone X etc.)
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    flexShrink: 0,
                    bgcolor: 'background.paper',
                    zIndex: 10,
                    // Safe area padding for top notch
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            // Ensure minimum touch target of 44px (accessibility)
                            minHeight: '52px',
                            py: 1.5,
                        },
                        '& .Mui-selected': {
                            color: 'primary.main',
                        },
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    <Tab label="Sources" value="sources" />
                    <Tab label="Content" value="content" />
                    <Tab label="Publish" value="publish" />
                </Tabs>
            </Box>

            <Box
                key={activeTab}
                className="animate-fade-in"
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    // Responsive padding
                    // Fluid padding
                    p: 'clamp(12px, 1.5vw, 16px)',
                    minHeight: 0,
                    // Better scroll performance on iOS
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                }}
            >
                {activeTab === 'sources' && (
                    <LeftColumn
                        state={state}
                        onOpenSourcesModal={onOpenSourcesModal}
                        onOpenCurriculumModal={onOpenCurriculumModal}
                        onOpenVideoModal={onOpenVideoModal}
                        dispatch={dispatch}
                        isMobile={true}
                        hasCredits={hasCredits}
                        creditTooltip={creditTooltip}
                    />
                )}
                {activeTab === 'content' && (
                    <CenterColumn
                        state={state}
                        onApproveSlides={onApproveSlides}
                        onClosePreview={onClosePreview}
                        onOpenFeedbackModal={onOpenFeedbackModal}
                        onOpenSourcesModal={onOpenSourcesModal}
                        hasAnySources={state.sources.length > 0}
                        isMobile={true}
                    />
                )}
                {activeTab === 'publish' && (
                    <RightColumn
                        state={{ contentItems: state.contentItems }}
                        onPublishContent={onPublishContent}
                        onUnpublishContent={onUnpublishContent}
                        onClearAll={onClearAllContent}
                        onDeleteContent={onDeleteContent}
                        isMobile={true}
                        isLoading={isLoadingContent}
                        onPreviewContent={handlePreviewContent}
                    />
                )}
            </Box>
        </Box>
    );
};

export default MobileLayout;
