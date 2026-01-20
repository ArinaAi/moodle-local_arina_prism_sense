import React from 'react';
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import SmoothProgressBar from './SmoothProgressBar';
import ThoughtStream from './ThoughtStream';
import VideoLoadingSkeleton from './VideoLoadingSkeleton';

type ProcessingStatus =
    | 'queued' | 'pending' | 'processing'
    | 'toc_generation' | 'toc_completed'
    | 'lecture_generation' | 'lecture_completed'
    | 'slides_generation' | 'slides_completed'
    | null;

interface GeneratingStateProps {
    isGeneratingVideo: boolean;
    isGeneratingSlides: boolean;
    processingStatus?: ProcessingStatus;
}

const GeneratingState: React.FC<GeneratingStateProps> = ({
    isGeneratingVideo,
    isGeneratingSlides: _isGeneratingSlides,
    processingStatus = null
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Responsive styles
    const styles = {
        padding: isMobile ? 1 : 2,
        gap: isMobile ? 1 : 1.5,
        iconSize: isMobile ? 28 : 36,
        emojiSize: isMobile ? '14px' : '18px',
        titleFontSize: isMobile ? '0.9rem' : '1.1rem',
        captionFontSize: isMobile ? '0.65rem' : '0.75rem',
        skeletonHeight: isMobile ? 180 : 300,
        thumbnailHeight: isMobile ? 45 : 65,
        thumbnailCount: isMobile ? [1, 2, 3] : [1, 2, 3, 4],
        maxWidth: isMobile ? '100%' : 580,
    };

    // Video generation view
    if (isGeneratingVideo) {
        return (
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: styles.padding,
                maxWidth: 700,
                mx: 'auto',
                overflow: 'auto',
            }}>
                <VideoLoadingSkeleton />
                <SmoothProgressBar processingStatus={processingStatus} />
                <ThoughtStream processingStatus={processingStatus} isVideo={true} />
            </Box>
        );
    }

    // Slide generation view
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 0,
                overflow: 'auto',
                p: styles.padding,
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: styles.gap, mb: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: styles.iconSize,
                        height: styles.iconSize,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                            '50%': { transform: 'scale(1.05)', opacity: 0.9 },
                        },
                    }}
                >
                    <Typography sx={{ fontSize: styles.emojiSize }}>✨</Typography>
                </Box>
                <Box>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            color: '#0f6cbf',
                            fontSize: styles.titleFontSize,
                        }}
                    >
                        Creating Your Slides
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: styles.captionFontSize }}
                    >
                        AI-powered presentation generation
                    </Typography>
                </Box>
            </Box>

            {/* Skeleton Preview */}
            <Box sx={{ width: '100%', maxWidth: styles.maxWidth, flexShrink: 0 }}>
                <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={styles.skeletonHeight}
                    sx={{
                        borderRadius: 2,
                        mb: 1,
                        border: '2px solid #e0e0e0',
                        bgcolor: '#f5f5f5',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    animation="wave"
                />

                {/* Thumbnails */}
                <Box sx={{
                    display: 'flex',
                    gap: styles.gap,
                    justifyContent: 'center',
                    mb: 1.5,
                }}>
                    {styles.thumbnailCount.map((i) => (
                        <Skeleton
                            key={i}
                            variant="rectangular"
                            width={isMobile ? 70 : 110}
                            height={styles.thumbnailHeight}
                            sx={{
                                borderRadius: 1,
                                border: '2px solid #e0e0e0',
                                bgcolor: '#f5f5f5',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                flexShrink: 0,
                            }}
                            animation="wave"
                        />
                    ))}
                </Box>

                {/* Smooth Progress Bar */}
                <SmoothProgressBar processingStatus={processingStatus} />
            </Box>

            {/* Thought Stream - Centered */}
            <ThoughtStream processingStatus={processingStatus} />
        </Box>
    );
};

export default GeneratingState;
