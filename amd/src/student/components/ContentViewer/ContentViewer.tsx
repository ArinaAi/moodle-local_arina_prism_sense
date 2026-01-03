import React from 'react';
import { Box, Typography, Breadcrumbs, Paper, IconButton } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoViewer from '../VideoViewer/VideoViewer';
import { useContent } from '../../context/ContentContext';

const ContentViewer: React.FC = () => {
    // Determine content type from context
    const { selectedContent } = useContent();
    const isVideo = selectedContent?.type === 'video';

    return (
        <Paper elevation={0} sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 1,
            bgcolor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            overflow: 'hidden'
        }}>
            {/* Header Section (Breadcrumbs & Title) */}
            <Box sx={{ p: 3, pb: 1 }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }}>
                    <Typography color="text.secondary">Course Materials</Typography>
                    <Typography color="text.secondary">Introduction to AI</Typography>
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedContent?.title || 'Course Overview'}
                    </Typography>
                </Breadcrumbs>
                <Typography variant="h5" sx={{ fontWeight: 600, mt: 1 }}>
                    {selectedContent?.title || 'Course Overview'}
                </Typography>
            </Box>

            {/* Content Area Container */}
            <Box sx={{
                flexGrow: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>

                {isVideo ? (
                    /* Video Preview */
                    <Box sx={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        bgcolor: '#f8f9fa'
                    }}>
                        <Box sx={{ width: '100%', maxWidth: '100%', aspectRatio: '16/9' }}>
                            <VideoViewer
                                videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                                title={selectedContent?.title || 'Video Lecture'}
                            />
                        </Box>
                    </Box>
                ) : (
                    /* Slide Preview Area (Mock) */
                    <Box sx={{
                        position: 'relative',
                        flexGrow: 1,
                        bgcolor: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        p: 4,
                        mx: 3,
                        mb: 0,
                        mt: 1,
                        borderRadius: 2,
                        border: '1px solid #eee'
                    }}>
                        {/* Toolbar - Now inside the slide preview */}
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex' }}>
                            <IconButton size="small"><ZoomInIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><DownloadIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><FullscreenIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><MoreVertIcon fontSize="small" /></IconButton>
                        </Box>

                        <Typography variant="h1" sx={{ color: '#2563eb', fontWeight: 'bold' }}>1</Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>Slide Preview</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedContent?.title || 'Course Overview'}</Typography>
                    </Box>
                )}

            </Box>

            {/* Footer / Controls */}
            {!isVideo && (
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'white'
                }}>
                    <IconButton disabled>
                        <ChevronLeftIcon />
                        <Typography variant="body2" sx={{ ml: 1 }}>Previous</Typography>
                    </IconButton>

                    <Typography sx={{ mx: 4, fontWeight: 500 }}>
                        1 / <span style={{ color: '#666' }}>24</span>
                    </Typography>

                    {/* Pagination Dots (Simplified) */}
                    <Box sx={{ display: 'flex', gap: 0.5, mr: 4 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: '#2563eb' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: '#e0e0e0' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: '#e0e0e0' }} />
                    </Box>

                    <IconButton>
                        <Typography variant="body2" sx={{ mr: 1 }}>Next</Typography>
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            )}
        </Paper>
    );
};

export default ContentViewer;
