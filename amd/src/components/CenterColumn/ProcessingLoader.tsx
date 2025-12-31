import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';

const VideoLoadingSkeleton: React.FC = () => {
    return (
        <Box sx={{ p: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Text */}
            <Box sx={{ textAlign: 'center', mb: 4, pt: 4 }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        color: '#0f6cbf',
                        mb: 1,
                        animation: 'fadeInOut 2s ease-in-out infinite',
                        '@keyframes fadeInOut': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.6 },
                        },
                    }}
                >
                    Generating Video Lecture...
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5 }}>
                    Synthesizing avatar, voice, and slides using AI
                </Typography>
                <Typography variant="caption" sx={{ color: '#868e96', display: 'block' }}>
                    This usually takes 2-5 minutes. Please wait.
                </Typography>
            </Box>

            {/* Video Player Skeleton (16:9 Aspect Ratio) */}
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%', // 16:9 Aspect Ratio
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#000', // Video players usually have black background
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Shimmer Effect Overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                            animation: 'shimmer 2.5s infinite',
                            '@keyframes shimmer': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(100%)' },
                            },
                        }}
                    />

                    {/* Play Icon Placeholder (Static or Pulsing) */}
                    <Box
                        sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                    </Box>
                </Box>
            </Box>

            {/* Status Lines Below Video */}
            <Box sx={{ mt: 3, px: 2 }}>
                <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={20} />
            </Box>
        </Box>
    );
};

export default VideoLoadingSkeleton;
