import React from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VideoViewer from '../VideoViewer/VideoViewer';
import { SlideImage } from './useContentSlides';

interface ContentDisplayAreaProps {
    isVideo: boolean;
    videoUrl: string;
    title: string;
    isLoading: boolean;
    error: string | null;
    currentSlideData: SlideImage | undefined;
    hasSlides: boolean;
}

const ContentDisplayArea: React.FC<ContentDisplayAreaProps> = ({
    isVideo,
    videoUrl,
    title,
    isLoading,
    error,
    currentSlideData,
    hasSlides
}) => {
    return (
        <Box sx={{
            flexGrow: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: isVideo ? '#000' : '#f0f4f8', // Fallback
            background: isVideo ? '#000' : 'linear-gradient(180deg, #f0f4f8 0%, #eef2f6 100%)',
            m: 0,
        }}>

            {isVideo ? (
                /* Video Preview */
                <Box sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                }}>
                    <VideoViewer
                        videoUrl={videoUrl || ""}
                        title={title}
                    />
                </Box>
            ) : (
                /* Slide Preview Area */
                <Box sx={{
                    position: 'relative',
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    p: 4,
                    overflow: 'hidden',
                    perspective: '1000px'
                }}>
                    {/* Status / Loading */}
                    {isLoading && <CircularProgress size={40} thickness={4} sx={{ color: '#2563eb' }} />}
                    {error && (
                        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                            <Box sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}>⚠️</Box>
                            <Typography>{error}</Typography>
                        </Box>
                    )}

                    {/* Slide Image Card */}
                    {!isLoading && !error && currentSlideData && (
                        <Box sx={{
                            position: 'relative',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            }
                        }}>
                            <img
                                src={currentSlideData.data}
                                alt={`Slide ${currentSlideData.slideNumber}`}
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: 'calc(100vh - 280px)', // Constrain height to fit in view with header/footer
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}

                    {/* Glass Toolbar (Floating Top-Right) */}
                    {!isLoading && !error && hasSlides && (
                        <Box sx={{
                            position: 'absolute',
                            top: 24,
                            right: 24,
                            zIndex: 10,
                            display: 'flex',
                            gap: 1,
                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '12px',
                            p: 0.75,
                            border: '1px solid rgba(255,255,255,0.5)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                        }}>
                            <IconButton size="small" sx={{ color: '#444746' }}><ZoomInIcon fontSize="small" /></IconButton>
                            <IconButton size="small" sx={{ color: '#444746' }}><DownloadIcon fontSize="small" /></IconButton>
                            <IconButton size="small" sx={{ color: '#444746' }}><FullscreenIcon fontSize="small" /></IconButton>
                            <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(0,0,0,0.1)', my: 'auto', mx: 0.5 }} />
                            <IconButton size="small" sx={{ color: '#444746' }}><MoreVertIcon fontSize="small" /></IconButton>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ContentDisplayArea;
