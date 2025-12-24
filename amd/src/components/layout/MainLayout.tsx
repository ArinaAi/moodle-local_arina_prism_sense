// components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery, Tabs, Tab } from '@mui/material';
import LeftColumn from './LeftColumn';
import CenterColumn from './CenterColumn';
import RightColumn from './RightColumn';
import type { AppState, AppAction } from '../../types/app';

interface MainLayoutProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onOpenSourcesModal: () => void;
  onOpenCurriculumModal: () => void;
  onApproveSlides: () => void;
  onClosePreview?: () => void;
  onOpenFeedbackModal: () => void;
  onPublishContent: (contentId: string) => void;
  onClearAllContent: () => void;
  onDeleteContent: (contentId: number) => void;
  isLoadingContent?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  state,
  dispatch,
  onOpenSourcesModal,
  onOpenCurriculumModal,
  onApproveSlides,
  onClosePreview,
  onOpenFeedbackModal,
  onPublishContent,
  onClearAllContent,
  onDeleteContent,
  isLoadingContent = false,
}) => {
  const theme = useTheme();

  // Proper breakpoints for responsiveness
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // 600px - 1200px

  // State for mobile tab navigation
  const [mobileActiveTab, setMobileActiveTab] = useState<'sources' | 'content' | 'publish'>('content');

  // Handle mobile tab change - AUTO SWITCH to sources when clicking upload in content tab
  const handleMobileTabChange = (_event: React.SyntheticEvent, newValue: 'sources' | 'content' | 'publish') => {
    setMobileActiveTab(newValue);
  };

  // handleOpenSourcesModalFromOtherTab removed - no longer needed since CenterColumn doesn't trigger source modal

  // Mobile: Tab navigation with proper scrolling
  if (isMobile) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 60px)', // Use dvh for mobile, adjust offset for smaller header
          minHeight: '400px',
          overflow: 'hidden',
          backgroundColor: 'background.default',
        }}
      >
        {/* Mobile Tabs Header */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper', zIndex: 10 }}>
          <Tabs
            value={mobileActiveTab}
            onChange={handleMobileTabChange}
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

        {/* Tab Content - Scrollable area */}
        <Box
          key={mobileActiveTab} // Key forces re-render for animation
          className="animate-fade-in" // Add simple fade animation
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >
          {mobileActiveTab === 'sources' && (
            <LeftColumn
              state={state}
              onOpenSourcesModal={onOpenSourcesModal}
              onOpenCurriculumModal={onOpenCurriculumModal}
              dispatch={dispatch}
              isMobile={true}
            />
          )}
          {mobileActiveTab === 'content' && (
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
          {mobileActiveTab === 'publish' && (
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
  }

  // Tablet: Two column layout with proper height
  if (isTablet) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr',
          gap: 2,
          p: 2,
          height: 'calc(100vh - 120px)',
          minHeight: '500px',
          overflow: 'hidden',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <LeftColumn
            state={state}
            onOpenSourcesModal={onOpenSourcesModal}
            onOpenCurriculumModal={onOpenCurriculumModal}
            dispatch={dispatch}
          />
        </Box>

        {/* Right Column (stacked Center + Right) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <CenterColumn
              state={state}
              onApproveSlides={onApproveSlides}
              onClosePreview={onClosePreview}
              onOpenFeedbackModal={onOpenFeedbackModal}
              onOpenSourcesModal={onOpenSourcesModal}
              hasAnySources={state.sources.length > 0}
            />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <RightColumn
              state={{ contentItems: state.contentItems }}
              onPublishContent={onPublishContent}
              onClearAll={onClearAllContent}
              onDeleteContent={onDeleteContent}
              isLoading={isLoadingContent}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Desktop: Three column layout with consistent height
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
        />
      </Box>
    </Box>
  );
};

export default MainLayout;