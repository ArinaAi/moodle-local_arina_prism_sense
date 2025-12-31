import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
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

    if (isGeneratingVideo) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, maxWidth: 800, mx: 'auto' }}>
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
};

export default GeneratingState;
