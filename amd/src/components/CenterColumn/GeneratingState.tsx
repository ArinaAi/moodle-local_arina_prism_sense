import React from 'react';
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import ThoughtStream from './ThoughtStream';
import VideoLoadingSkeleton from './VideoLoadingSkeleton';

interface GeneratingStateProps {
    isGeneratingVideo: boolean;
    isGeneratingSlides: boolean;
}

const GeneratingState: React.FC<GeneratingStateProps> = ({
    isGeneratingVideo,
    isGeneratingSlides
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Extract responsive values to reduce cognitive complexity
    const styles: {
        padding: number;
        gap: number;
        iconSize: number;
        emojiSize: string;
        titleVariant: 'subtitle1' | 'h6';
        titleFontSize: string;
        captionFontSize: string;
        skeletonHeight: number;
        thumbnailHeight: number;
        thumbnailCount: number[];
        maxWidth: string | number;
        mb: number;
    } = {
        padding: isMobile ? 2 : 3,
        gap: isMobile ? 1 : 1.5,
        iconSize: isMobile ? 32 : 40,
        emojiSize: isMobile ? '16px' : '20px',
        titleVariant: isMobile ? 'subtitle1' : 'h6',
        titleFontSize: isMobile ? '1rem' : '1.25rem',
        captionFontSize: isMobile ? '0.7rem' : '0.75rem',
        skeletonHeight: isMobile ? 200 : 394,
        thumbnailHeight: isMobile ? 56 : 88,
        thumbnailCount: isMobile ? [1, 2, 3] : [1, 2, 3, 4],
        maxWidth: isMobile ? '100%' : 700,
        mb: isMobile ? 2 : 3,
    };

    if (isGeneratingVideo) {
        return (
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: styles.padding,
                maxWidth: 800,
                mx: 'auto'
            }}>
                <VideoLoadingSkeleton />
                <Box sx={{ mt: 2 }}>
                    <ThoughtStream isActive={true} />
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: styles.padding,
            }}
        >
            {/* Header with AI Icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: styles.gap, mb: 2 }}>
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
                        variant={styles.titleVariant}
                        sx={{
                            fontWeight: 700,
                            color: '#0f6cbf',
                            mb: 0.5,
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

            {/* Skeleton Preview - 16:9 aspect ratio */}
            <Box sx={{ width: '100%', maxWidth: styles.maxWidth }}>
                <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={styles.skeletonHeight}
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
                <Box sx={{
                    display: 'flex',
                    gap: styles.gap,
                    justifyContent: 'center',
                    mb: styles.mb,
                    overflowX: 'auto',
                }}>
                    {styles.thumbnailCount.map((i) => (
                        <Skeleton
                            key={i}
                            variant="rectangular"
                            width='100%'
                            height={styles.thumbnailHeight}
                            sx={{
                                borderRadius: 1,
                                border: '2px solid #e0e0e0',
                                bgcolor: '#f5f5f5',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                flexShrink: 0,
                            }}
                            animation="wave"
                        />
                    ))}
                </Box>

                {/* Thought Stream - Dynamic AI Logs */}
                <ThoughtStream isActive={isGeneratingSlides} />
            </Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: styles.captionFontSize }}
            >
                The slides will be available shortly.
            </Typography>
        </Box>
    );
};

export default GeneratingState;

