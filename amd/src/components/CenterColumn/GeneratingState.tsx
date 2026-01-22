import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import SmoothProgressBar from './SmoothProgressBar';
import ThoughtStream from './ThoughtStream';
import VideoLoadingSkeleton from './VideoLoadingSkeleton';

type ProcessingStatus =
    | 'queued' | 'pending' | 'processing'
    | 'toc_generation' | 'toc_completed'
    | 'lecture_generation' | 'lecture_completed'
    | 'slides_generation' | 'slides_completed'
    | 'audio_completed' | 'video_completed'
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

    // Video generation view
    if (isGeneratingVideo) {
        return (
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 'clamp(8px, 1.5vw, 16px)',
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
                p: 'clamp(8px, 1.5vw, 16px)',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.25vw, 12px)', mb: 1.5 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'clamp(28px, 3.5vw, 36px)',
                        height: 'clamp(28px, 3.5vw, 36px)',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                            '50%': { transform: 'scale(1.05)', opacity: 0.9 },
                        },
                    }}
                >
                    <Typography sx={{ fontSize: 'clamp(14px, 1.8vw, 18px)' }}>✨</Typography>
                </Box>
                <Box>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            color: '#0f6cbf',
                            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                        }}
                    >
                        Creating Your Slides
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)' }}
                    >
                        AI-powered presentation generation
                    </Typography>
                </Box>
            </Box>

            {/* Skeleton Preview */}
            <Box sx={{ width: '100%', maxWidth: 'clamp(300px, 80vw, 580px)', flexShrink: 0 }}>
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '56.25%', // 16:9 aspect ratio
                        mb: 1,
                    }}
                >
                    <Skeleton
                        variant="rectangular"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            borderRadius: 2,
                            border: '2px solid #e0e0e0',
                            bgcolor: '#f5f5f5',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        animation="wave"
                    />
                </Box>

                {/* Thumbnails */}
                <Box sx={{
                    display: 'flex',
                    gap: 'clamp(8px, 1.25vw, 12px)',
                    justifyContent: 'center',
                    mb: 1.5,
                    width: '100%',
                }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Box
                            key={i}
                            sx={{
                                position: 'relative',
                                flex: '1 1 0',
                                minWidth: 0,
                                maxWidth: '110px',
                                display: { xs: i > 3 ? 'none' : 'block', sm: 'block' }
                            }}
                        >
                            <Box sx={{ paddingTop: '56.25%' }}>
                                <Skeleton
                                    variant="rectangular"
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 1,
                                        border: '2px solid #e0e0e0',
                                        bgcolor: '#f5f5f5',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    }}
                                    animation="wave"
                                />
                            </Box>
                        </Box>
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
