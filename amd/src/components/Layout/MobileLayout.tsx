import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import RightColumn from '../RightColumn/RightColumn';
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
    onClearAllContent,
    onDeleteContent,
    isLoadingContent,
}) => {
    const [activeTab, setActiveTab] = useState<'sources' | 'content' | 'publish'>('content');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: 'sources' | 'content' | 'publish') => {
        setActiveTab(newValue);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100dvh - 60px)',
                minHeight: '400px',
                overflow: 'hidden',
                backgroundColor: 'background.default',
            }}
        >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper', zIndex: 10 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            minHeight: '48px',
                        },
                        '& .Mui-selected': {
                            color: 'primary.main',
                        }
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
                    p: 2,
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {activeTab === 'sources' && (
                    <LeftColumn
                        state={state}
                        onOpenSourcesModal={onOpenSourcesModal}
                        onOpenCurriculumModal={onOpenCurriculumModal}
                        onOpenVideoModal={onOpenVideoModal}
                        dispatch={dispatch} // Dispatch is required for LeftColumn
                        isMobile={true}
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
                        onClearAll={onClearAllContent}
                        onDeleteContent={onDeleteContent}
                        isMobile={true}
                        isLoading={isLoadingContent}
                    />
                )}
            </Box>
        </Box>
    );
};

export default MobileLayout;
