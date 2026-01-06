import React, { useState, useEffect } from 'react';
import { Box, Typography, Breadcrumbs, Paper, IconButton, CircularProgress } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoViewer from '../VideoViewer/VideoViewer';
import { useContent } from '../../context/ContentContext';

interface SlideImage {
    filename: string;
    data: string; // base64
    slideNumber: number;
}

const ContentViewer: React.FC = () => {
    // Determine content type from context
    const { selectedContent } = useContent();
    const isVideo = selectedContent?.type === 'video';

    // Slide State
    const [slides, setSlides] = useState<SlideImage[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Slides
    useEffect(() => {
        if (!selectedContent || isVideo) {
            return;
        }

        const loadSlides = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const M = (window as any).M;
                const wwwroot = M?.cfg?.wwwroot || '';
                const response = await fetch(`${wwwroot}/local/lecturebot/api/get_slide_images.php?contentid=${selectedContent.id}`);

                if (!response.ok) {
                    throw new Error('Failed to load slides');
                }

                const data = await response.json();
                if (data.status === 'success' && data.images) {
                    setSlides(data.images);
                    setCurrentSlide(0);
                } else {
                    setError('No slides found');
                }
            } catch (err) {
                console.error(err);
                setError('Error loading presentation');
            } finally {
                setIsLoading(false);
            }
        };

        loadSlides();
    }, [selectedContent, isVideo]);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    if (!selectedContent) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Select content to view</Typography>
            </Box>
        );
    }

    // Construct Video URL if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const M = (window as any).M;
    const wwwroot = M?.cfg?.wwwroot || '';
    const courseId = M?.cfg?.courseId || (new URLSearchParams(window.location.search)).get('id') || 0;
    const videoUrl = `${wwwroot}/local/lecturebot/api/stream_video.php?courseid=${courseId}&contentid=${selectedContent.id}`;

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
                    <Typography color="text.secondary">Topic</Typography>
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
                bgcolor: '#f8f9fa',
                mx: 3,
                mt: 1,
                mb: isVideo ? 3 : 0,
                borderRadius: 2,
                border: '1px solid #eee'
            }}>

                {isVideo ? (
                    /* Video Preview */
                    <Box sx={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 0,
                        bgcolor: 'black',
                        width: '100%',
                        height: '100%'
                    }}>
                        <Box sx={{ width: '100%', height: '100%' }}>
                            <VideoViewer
                                videoUrl={videoUrl || ""}
                                title={selectedContent.title}
                            />
                        </Box>
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
                        height: '100%'
                    }}>
                        {/* Status / Loading */}
                        {isLoading && <CircularProgress />}
                        {error && <Typography color="error">{error}</Typography>}

                        {/* Slide Image */}
                        {!isLoading && !error && slides[currentSlide] && (
                            <img
                                src={slides[currentSlide].data}
                                alt={`Slide ${currentSlide + 1}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}
                            />
                        )}

                        {/* Toolbar (Overlay) */}
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex' }}>
                            <IconButton size="small"><ZoomInIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><DownloadIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><FullscreenIcon fontSize="small" /></IconButton>
                            <IconButton size="small"><MoreVertIcon fontSize="small" /></IconButton>
                        </Box>
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
                    <IconButton onClick={handlePrev} disabled={currentSlide === 0}>
                        <ChevronLeftIcon />
                        <Typography variant="body2" sx={{ ml: 1 }}>Previous</Typography>
                    </IconButton>

                    <Typography sx={{ mx: 4, fontWeight: 500 }}>
                        {currentSlide + 1} / <span style={{ color: '#666' }}>{slides.length || '-'}</span>
                    </Typography>

                    {/* Pagination Dots (Simplified - showing max 5 for UI effect, logic complex for large decks) */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, mr: 4 }}>
                        {slides.slice(0, Math.min(5, slides.length)).map((slide, idx) => (
                            <Box key={`dot-${slide.slideNumber || idx}`} sx={{
                                width: 8,
                                height: 8,
                                borderRadius: 2,
                                bgcolor: idx === (currentSlide % 5) ? '#2563eb' : '#e0e0e0'
                            }} />
                        ))}
                    </Box>

                    <IconButton onClick={handleNext} disabled={currentSlide === slides.length - 1}>
                        <Typography variant="body2" sx={{ mr: 1 }}>Next</Typography>
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            )}
        </Paper>
    );
};

export default ContentViewer;
