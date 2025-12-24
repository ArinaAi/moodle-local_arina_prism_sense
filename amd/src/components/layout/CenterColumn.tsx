import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, useTheme, IconButton, Skeleton, Chip, Card,
  CardContent,
} from '@mui/material';
import { Check, Refresh, Download, Close, CheckCircle } from '@mui/icons-material';
import { Settings } from 'lucide-react';
import PptxViewer from '../slides/PptxViewer';

import ThoughtStream from '../shared/ThoughtStream';

import type { Slide, GenerateLectureResponse, ContentItem, SubtopicResult } from '../../types/app';
import type { MoodleContext } from '../../types/moodle';

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
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

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

  /* State Renderers */
  const renderUnsupportedContent = () => (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {activeContentType.replace('-', ' ').toUpperCase()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Content generation is available for chapters/sections with slides
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Generate slides first to enable content creation for specific chapters
      </Typography>
    </Box>
  );

  const renderGeneratingState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3,
      }}
    >
      {/* Header with AI Icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.05)', opacity: 0.9 },
            },
          }}
        >
          <Typography sx={{ fontSize: '20px' }}>✨</Typography>
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f6cbf', mb: 0.5 }}>
            Creating Your Slides
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AI-powered presentation generation
          </Typography>
        </Box>
      </Box>

      {/* Skeleton Preview - 16:9 aspect ratio */}
      <Box sx={{ width: '100%', maxWidth: 700 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={394} // 700 / (16/9) = 393.75 ≈ 394
          sx={{
            borderRadius: 2,
            mb: 2,
            border: '2px solid #e0e0e0',
            bgcolor: '#f5f5f5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          animation="wave"
        />

        {/* Thumbnails - 16:9 aspect ratio */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width='100%'
              height={88}
              sx={{
                borderRadius: 1,
                border: '2px solid #e0e0e0',
                bgcolor: '#f5f5f5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              animation="wave"
            />
          ))}
        </Box>

        {/* Thought Stream - Dynamic AI Logs */}
        <ThoughtStream isActive={isGeneratingSlides} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        The slides will be available shortly.
      </Typography>
    </Box>
  );

  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '400px',
        height: '100%',
      }}
    >
      <Box
        sx={{
          width: 70,
          height: 70,
          borderRadius: '50%',
          backgroundColor: 'rgba(13, 92, 162, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <Settings size={36} color="#0D5CA2" />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Get Started with LectureBot
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, fontSize: '0.75rem' }}>
        Upload your PDF sources to begin generating lecture content
      </Typography>
      {onOpenSourcesModal && (
        <Button
          variant="contained"
          size="large"
          startIcon={<Settings size={20} />}
          onClick={onOpenSourcesModal}
          sx={{
            py: 1.5,
            px: 4,
            fontWeight: 600,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
              boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          Manage Sources
        </Button>
      )}
    </Box>
  );

  const renderReadyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '400px',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <Check sx={{ fontSize: 40, color: '#28a745' }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Ready to Generate Slides
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Your sources are uploaded and ready
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Click &quot;Slide Deck&quot; in the Content Dock to create your lecture
      </Typography>
    </Box>
  );

  /* New Helper Functions for renderSlidesPreview */
  const renderSlideInfo = (currentTopic: SubtopicResult, totalSlides: number) => (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        {totalSlides} slide{totalSlides !== 1 ? 's' : ''} generated for {currentTopic?.topic || 'this section'}
      </Typography>
      {isApproved && (
        <Chip
          icon={<CheckCircle />}
          label={currentContentItem?.approver
            ? `Approved by ${currentContentItem.approver.fullname}`
            : 'Approved'
          }
          color="success"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      )}
    </Box>
  );

  const renderPptxDisplay = () => (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '16/9',
        minHeight: isMobile ? '250px' : '600px',
        maxHeight: isMobile ? '50vh' : '850px',
        border: '2px solid #e0e0e0',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      {currentContentId && moodleContext && (
        <PptxViewer
          contentId={currentContentId}
          courseId={moodleContext.courseid}
        />
      )}
    </Box>
  );

  const renderTopicNavigation = () => {
    if (!generatedContent || generatedContent.results.length <= 1) {
      return null;
    }

    return (
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {generatedContent.results.map((topic, idx) => (
          <Button
            key={topic.topic}
            variant={idx === currentTopicIndex ? 'contained' : 'outlined'}
            size="small"
            onClick={() => {
              setCurrentTopicIndex(idx);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: idx === currentTopicIndex ? 600 : 400,
            }}
          >
            Topic {idx + 1}
          </Button>
        ))}
      </Box>
    );
  };

  const renderActionButtons = () => (
    <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mt: 3 }}>
      <Button
        variant={isApproved ? 'contained' : 'outlined'}
        color={isApproved ? 'success' : 'primary'}
        startIcon={<Check />}
        onClick={onApproveSlides}
        disabled={isApproved}
        fullWidth={isMobile}
        sx={{
          fontWeight: 600,
          border: isApproved ? 'none' : '1px solid #28A745',
          color: isApproved ? '#fff' : '#28A745',
          py: 1.5,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderWidth: isApproved ? 0 : 1,
            backgroundColor: isApproved ? undefined : '#dff5e4ff',
            transform: isApproved ? 'none' : 'translateY(-2px)',
            borderColor: '#28A745',
          },
          '&.Mui-disabled': {
            backgroundColor: '#28A745',
            color: '#fff',
            opacity: 0.9,
          },
        }}
      >
        {isApproved ? 'Approved' : 'Approve Slides'}
        {/* Sparkle effects on click */}
        <Box
          className={isApproved ? "animate-pop" : ""}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            overflow: 'hidden',
            display: isApproved ? 'block' : 'none',
          }}
        >
          {['sparkle-0', 'sparkle-1', 'sparkle-2', 'sparkle-3', 'sparkle-4', 'sparkle-5'].map((id, i) => (
            <Box
              key={id}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 4,
                height: 4,
                background: '#FFD700',
                borderRadius: '50%',
                animation: `sparkle-${i} 0.6s ease-out forwards`,
                '@keyframes sparkle-0': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, -20px) scale(0)' } },
                '@keyframes sparkle-1': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, -20px) scale(0)' } },
                '@keyframes sparkle-2': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, 20px) scale(0)' } },
                '@keyframes sparkle-3': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, 20px) scale(0)' } },
                '@keyframes sparkle-4': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, -30px) scale(0)' } },
                '@keyframes sparkle-5': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, 30px) scale(0)' } },
              }}
            />
          ))}
        </Box>
      </Button>
      {!currentContentItem || currentContentItem.status !== 'published' ? (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Refresh />}
          onClick={onOpenFeedbackModal}
          fullWidth={isMobile}
          sx={{
            fontWeight: 600,
            py: 1.5,
            borderWidth: 1,
            transition: 'all 0.3s ease',
            '&:hover': {
              borderWidth: 1,
              backgroundColor: 'rgba(15, 108, 191, 0.08)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          Regenerate
        </Button>
      ) : null}
      <Button
        variant="outlined"
        color="primary"
        startIcon={<Download />}
        onClick={handleDownloadSlides}
        fullWidth={isMobile}
        sx={{
          fontWeight: 600,
          py: 1.5,
          borderWidth: 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            borderWidth: 1,
            backgroundColor: 'rgba(15, 108, 191, 0.08)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        Download
      </Button>
    </Stack>
  );

  const renderSlidesPreview = () => {
    const currentTopic = generatedContent?.results[currentTopicIndex];
    const totalSlides = currentTopic?.slideCount || currentTopic?.content?.length || 0;

    return (
      <>
        <Box className="animate-scale-up" sx={{ width: '100%' }}>
          {currentTopic && renderSlideInfo(currentTopic, totalSlides)}
          {renderPptxDisplay()}
          {renderTopicNavigation()}
          {renderActionButtons()}
        </Box>
      </>
    );
  };

  const renderContent = () => {
    if (activeContentType !== 'slide-deck') {
      return renderUnsupportedContent();
    }

    // Check for the new generatedContent format (from preview)
    if (!generatedContent && (!generatedSlides || generatedSlides.length === 0)) {
      if (isGeneratingSlides) {
        return renderGeneratingState();
      }
      if (!hasAnySources) {
        return renderEmptyState();
      }
      // Ready state with sources uploaded
      return renderReadyState();
    }

    // Slides generated - show PPTX viewer
    return renderSlidesPreview();
  };

  const theme = useTheme();

  const isPreviewingSlides = generatedContent && currentContentId;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobile ? 'auto' : '700px',
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
        p: 2,
        '&:last-child': {
          pb: 2,
        }
      }}>
        <Box sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}`, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Preview
          </Typography>
          {isPreviewingSlides && onClosePreview && (
            <IconButton
              onClick={onClosePreview}
              size="small"
              sx={{
                color: 'text.secondary',
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
        <Box sx={{ flex: 1 }}>{renderContent()}</Box>
      </CardContent>
    </Card>
  );
};

export default CenterColumn;
