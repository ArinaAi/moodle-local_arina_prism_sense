import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface VideoDisplayProps {
    videoUrl: string;
    topic?: string;
    isApproved: boolean;
    isMobile?: boolean;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({
    videoUrl,
    topic,
    isApproved,
    isMobile: _isMobile = false
}) => {

    return (
        <Box className="animate-scale-up" sx={{ width: '100%' }}>
            <Box sx={{ mb: 'clamp(8px, 1.5vh, 16px)' }}>
                {topic && (
                    <Typography
                        variant="h6"
                        color="#0f6cbf"
                        sx={{
                            fontWeight: 600,
                            fontSize: 'clamp(0.9rem, 2vw + 0.5rem, 1.25rem)',
                        }}
                    >
                        {topic}
                    </Typography>
                )}
                {isApproved && (
                    <Chip
                        label="Approved"
                        color="success"
                        size="small"
                        icon={<CheckCircle />}
                        sx={{
                            mt: 1,
                            fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                            height: 'clamp(24px, 3vw, 32px)',
                        }}
                    />
                )}
            </Box>
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    // Fluid adaptive heights
                    minHeight: 'clamp(180px, 35vh, 350px)',
                    maxHeight: 'clamp(300px, 55vh, 600px)',
                    border: '2px solid #e0e0e0',
                    borderRadius: 'clamp(4px, 1vw, 8px)',
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <video
                    src={videoUrl}
                    controls
                    autoPlay={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                >
                    Your browser does not support the video tag.
                </video>
            </Box>
        </Box>
    );
};

export default VideoDisplay;
