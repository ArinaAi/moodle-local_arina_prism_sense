import React, { useEffect } from 'react';
import {
  Box, Typography, IconButton, Card,
  CardContent, useTheme
} from '@mui/material';
import { Close } from '@mui/icons-material';

import type { Slide, GenerateLectureResponse, ContentItem } from '../../types/app';
import type { MoodleContext } from '../../types/moodle';

// Import New Refactored Components
import GeneratingState from './GeneratingState';
import EmptyState from './EmptyState';
import ReadyState from './ReadyState';
import VideoViewer from '../../student/components/VideoViewer/VideoViewer';
import SlideDisplay from './SlideDisplay';
import PreviewActions from './PreviewActions';

interface CenterColumnProps {
  state: {
    generatedSlides: Slide[] | null;
    generatedContent: GenerateLectureResponse | null;
    isGeneratingSlides: boolean;
    activeContentType: string;
    currentContentId: number | null;
    moodleContext: MoodleContext | null;
    contentItems: ContentItem[];
    slidesApproved: boolean;
  };
  onApproveSlides: () => void;
  onOpenFeedbackModal: () => void;
  onOpenSourcesModal?: () => void;
  onClosePreview?: () => void;
  hasAnySources?: boolean;
  isMobile?: boolean;
}

const CenterColumn: React.FC<CenterColumnProps> = ({
  state,
  onApproveSlides,
  onOpenFeedbackModal,
  onOpenSourcesModal,
  onClosePreview,
  hasAnySources = false,
  isMobile = false,
}) => {
  const { generatedSlides, generatedContent, activeContentType, currentContentId, moodleContext, isGeneratingSlides, contentItems, slidesApproved } = state;

  // Check specifically what type of content is generating
  const generatingVideoItem = contentItems.find(item => item.status === 'generating' && item.contenttype === 'video');
  const generatingSlideItem = contentItems.find(item => item.status === 'generating' && item.contenttype === 'slide-deck');
  const hasGeneratingVideo = !!generatingVideoItem;
  const hasGeneratingSlides = !!generatingSlideItem;

  // Find current content item to check approval status
  const currentContentItem = contentItems.find(item => item.id === currentContentId);
  const isApproved = currentContentItem?.approved || slidesApproved;

  // ESC key to close preview
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && generatedContent && onClosePreview) {
        onClosePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [generatedContent, onClosePreview]);

  const handleDownloadSlides = () => {
    if (!currentContentId) {
      return;
    }
    // Download the actual PPTX file
    if (moodleContext) {
      const downloadUrl = `${moodleContext.wwwroot}/local/lecturebot/api/download_pptx.php?contentid=${currentContentId}`;
      window.location.href = downloadUrl;
    }
  };

  const renderUnsupportedContent = () => (
    <Box sx={{ textAlign: 'center', p: 'clamp(16px, 3vw, 32px)' }}>
      <Typography
        variant="h6"
        color="text.secondary"
        gutterBottom
        sx={{ fontSize: 'clamp(0.9rem, 2vw, 1.25rem)' }}
      >
        {activeContentType.replace('-', ' ').toUpperCase()}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}
      >
        Content generation is available for chapters/sections with slides
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 'clamp(0.65rem, 1.25vw, 0.75rem)' }}
      >
        Generate slides first to enable content creation for specific chapters
      </Typography>
    </Box>
  );

  const renderStatusState = () => {
    // Generating State
    if (activeContentType === 'video' && hasGeneratingVideo) {
      return <GeneratingState isGeneratingVideo={true} isGeneratingSlides={false} processingStatus={generatingVideoItem?.processing_status} />;
    }

    if (activeContentType === 'slide-deck' && (isGeneratingSlides || hasGeneratingSlides)) {
      return <GeneratingState isGeneratingVideo={false} isGeneratingSlides={true} processingStatus={generatingSlideItem?.processing_status} />;
    }

    // Empty State
    if (!hasAnySources) {
      return <EmptyState onOpenSourcesModal={onOpenSourcesModal} />;
    }
    // Ready State
    return <ReadyState />;
  };

  const renderContent = () => {
    if (activeContentType !== 'slide-deck' && activeContentType !== 'video') {
      return renderUnsupportedContent();
    }

    // Check for the new generatedContent format (from preview)
    if (!generatedContent && (!generatedSlides || generatedSlides.length === 0)) {
      return renderStatusState();
    }

    // Video View
    const videoUrl = generatedContent?.results[0]?.videoUrl;
    if (activeContentType === 'video' && videoUrl) {
      return (
        <Box className="animate-scale-up" sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              color="#0f6cbf"
              sx={{
                fontWeight: 600,
                fontSize: 'clamp(0.9rem, 2vw + 0.5rem, 1.25rem)',
              }}
            >
              {generatedContent.results[0].topic || 'Video Lecture'}
            </Typography>
          </Box>
          <VideoViewer
            videoUrl={videoUrl}
            title={generatedContent.results[0].topic || 'Video Lecture'}
          />
          <PreviewActions
            isApproved={isApproved}
            onApprove={onApproveSlides}
            onRegenerate={onOpenFeedbackModal}
            onDownload={handleDownloadSlides}
            currentContentItem={currentContentItem}
            isMobile={isMobile}
          />
        </Box>
      );
    }

    // Slide View
    return (
      <Box className="animate-scale-up" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <SlideDisplay
          generatedContent={generatedContent}
          currentContentItem={currentContentItem}
          moodleContext={moodleContext}
          isApproved={isApproved}
        />
        <PreviewActions
          isApproved={isApproved}
          onApprove={onApproveSlides}
          onRegenerate={onOpenFeedbackModal}
          onDownload={handleDownloadSlides}
          currentContentItem={currentContentItem}
          isMobile={isMobile}
        />
      </Box>
    );
  };

  const theme = useTheme();

  const isPreviewingSlides = generatedContent && currentContentId;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <CardContent sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 'clamp(12px, 1.5vh, 16px)',
        '&:last-child': {
          pb: 'clamp(12px, 1.5vh, 16px)',
        }
      }}>
        <Box sx={{
          pb: 'clamp(12px, 1.5vh, 16px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          mb: 'clamp(12px, 1.5vh, 16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 600, fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}
          >
            Preview
          </Typography>
          {isPreviewingSlides && onClosePreview && (
            <IconButton
              onClick={onClosePreview}
              size="small"
              sx={{
                color: 'text.secondary',
                // Fluid touch target
                minWidth: 'clamp(36px, 5vw, 44px)',
                minHeight: 'clamp(36px, 5vw, 44px)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.primary',
                },
              }}
              aria-label="Close preview"
            >
              <Close />
            </IconButton>
          )}
        </Box>
        <Box sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}>
          {renderContent()}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CenterColumn;
