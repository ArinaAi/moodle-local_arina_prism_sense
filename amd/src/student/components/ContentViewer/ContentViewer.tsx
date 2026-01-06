import React, { useState, useEffect } from 'react';
import { Box, Typography, Breadcrumbs, Paper, IconButton, CircularProgress, Button } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import VideoViewer from '../VideoViewer/VideoViewer';
import { useContent } from '../../context/ContentContext';

interface SlideImage {
    filename: string;
    data: string; // base64
    slideNumber: number;
}

const ContentViewer: React.FC = () => {
    // Determine content type from context
    const { selectedContent, setSelectedContent } = useContent();
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
            <Paper elevation={0} sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                borderRadius: 1,
                bgcolor: 'white',
                border: '1px solid rgba(0,0,0,0.06)'
            }}>
                <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: '#f0f4f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                }}>
                    <ZoomInIcon sx={{ fontSize: 40, color: '#94a3b8' }} /> {/* Placeholder for 'Content' icon */}
                </Box>
                <Typography variant="h6" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>
                    Select content to view
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, textAlign: 'center' }}>
                    Choose a slide deck or video from the course material list on the left to start learning.
                </Typography>
            </Paper>
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
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)'
        }}>
            {/* Header Section (Refined) */}
            <Box sx={{ p: 2.5, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />} sx={{ mb: 1, '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 500 } }}>
                        <Typography color="text.secondary">Course Materials</Typography>
                        <Typography color="text.secondary">Topic</Typography>
                    </Breadcrumbs>
                    <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#1a1c1e' }}>
                        {selectedContent?.title || 'Course Overview'}
                    </Typography>
                </Box>
                <IconButton
                    onClick={() => setSelectedContent(null as any)}
                    size="small"
                    sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: '#1e293b' } }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Content Area Container */}
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
                            title={selectedContent.title}
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
                        {!isLoading && !error && slides[currentSlide] && (
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
                                    src={slides[currentSlide].data}
                                    alt={`Slide ${currentSlide + 1}`}
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
                        {!isLoading && !error && slides.length > 0 && (
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

            {/* Content Footer / Navigation */}
            {!isVideo && (
                <Box sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Linear Progress Bar */}
                    {slides.length > 0 && (
                        <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: 4 }}>
                            <Box sx={{
                                height: '100%',
                                width: `${((currentSlide + 1) / slides.length) * 100}%`,
                                bgcolor: '#2563eb',
                                transition: 'width 0.3s ease',
                                borderTopRightRadius: 4,
                                borderBottomRightRadius: 4
                            }} />
                        </Box>
                    )}

                    <Box sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Button
                            variant="outlined"
                            onClick={handlePrev}
                            disabled={currentSlide === 0}
                            startIcon={<ChevronLeftIcon />}
                            sx={{
                                fontWeight: 600,
                                py: 1,
                                px: 3,
                                color: 'text.primary',
                                borderColor: 'rgba(0,0,0,0.12)',
                                borderWidth: 1,
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderWidth: 1,
                                    borderColor: 'text.primary',
                                    backgroundColor: 'rgba(0,0,0,0.04)',
                                    transform: 'translateY(-2px)',
                                },
                                '&.Mui-disabled': {
                                    borderWidth: 1,
                                    borderColor: 'rgba(0,0,0,0.06)'
                                }
                            }}
                        >
                            Previous
                        </Button>

                        <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                            {currentSlide + 1} <span style={{ color: '#cbd5e1', margin: '0 8px' }}>/</span> {slides.length}
                        </Typography>

                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={currentSlide === slides.length - 1}
                            endIcon={<ChevronRightIcon />}
                            sx={{
                                fontWeight: 600,
                                py: 1,
                                px: 4,
                                bgcolor: '#2563eb',
                                color: 'white',
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: '#1d4ed8',
                                    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};

export default ContentViewer;
