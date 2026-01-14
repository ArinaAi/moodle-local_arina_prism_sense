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
    isMobile = false
}) => {

    return (
        <Box className="animate-scale-up" sx={{ width: '100%' }}>
            <Box sx={{ mb: isMobile ? 1.5 : 2 }}>
                {topic && (
                    <Typography
                        variant={isMobile ? 'subtitle1' : 'h6'}
                        color="#0f6cbf"
                        sx={{
                            fontWeight: 600,
                            fontSize: isMobile ? '1rem' : '1.25rem',
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
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                        }}
                    />
                )}
            </Box>
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    // Use clamp for adaptive heights
                    minHeight: isMobile ? '200px' : 'clamp(300px, 40vh, 400px)',
                    maxHeight: isMobile ? '50vh' : 'clamp(450px, 55vh, 650px)',
                    border: '2px solid #e0e0e0',
                    borderRadius: 1,
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

