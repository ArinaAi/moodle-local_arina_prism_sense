import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, Fullscreen, FullscreenExit } from '@mui/icons-material';

interface PptxViewerProps {
  contentId: number;
  courseId: number;
}

interface SlideImage {
  filename: string;
  data: string; // base64 encoded image
  slideNumber: number;
}

const PptxViewer: React.FC<PptxViewerProps> = ({ contentId, courseId: _courseId }) => {
  // Viewer State
  const [usePdfFallback, setUsePdfFallback] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Carousel State
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wwwroot = (window as any).M?.cfg?.wwwroot || '';
  const pdfUrl = `${wwwroot}/local/lecturebot/api/view_pptx_as_pdf.php?contentid=${contentId}`;


  // Load slides / Check capability
  useEffect(() => {
    const loadSlides = async () => {
      try {
        setIsChecking(true);
        const response = await fetch(
          `${wwwroot}/local/lecturebot/api/get_slide_images.php?contentid=${contentId}`
        );

        if (!response.ok) {
          throw new Error('Failed to load slides');
        }

        const data = await response.json();

        if (data.status === 'error' || !data.images || data.images.length === 0) {
          setUsePdfFallback(true);
        } else {
          setSlides(data.images);

        }
      } catch (err) {
        console.error('Error loading slides:', err);
        setUsePdfFallback(true);
      } finally {
        setIsChecking(false);
      }
    };

    loadSlides();
  }, [contentId, wwwroot]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Navigation functions
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [prevSlide, nextSlide]);



  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen();
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // --- Render States ---

  if (isChecking) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a1a',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#667eea' }} />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 2 }}>
          Loading slides...
        </Typography>
      </Box>
    );
  }

  if (usePdfFallback) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
        <Box sx={{ p: 2, bgcolor: 'rgba(255,165,0,0.1)', borderBottom: '1px solid rgba(255,165,0,0.3)' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,165,0,0.9)' }}>
            ℹ️ Carousel view unavailable. Showing PDF preview instead.
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            title="Presentation Preview"
          />
        </Box>
      </Box>
    );
  }

  // Main Carousel Render
  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1a1a',
        position: 'relative',
        zIndex: isFullscreen ? 2000 : 'auto',
      }}
    >
      {/* Slide display */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src={slides[currentSlide]?.data}
          alt={`Slide ${currentSlide + 1}`}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Navigation arrows overlay */}
        <IconButton
          onClick={prevSlide}
          disabled={currentSlide === 0}
          sx={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#ffffff',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(0,0,0,0.3)' },
          }}
        >
          <ChevronLeft fontSize="large" />
        </IconButton>

        <IconButton
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#ffffff',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(0,0,0,0.3)' },
          }}
        >
          <ChevronRight fontSize="large" />
        </IconButton>

        {/* Slide counter overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'rgba(0,0,0,0.7)',
            color: '#ffffff',
            px: 2,
            py: 0.5,
            borderRadius: 2,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {currentSlide + 1} / {slides.length}
        </Box>

        {/* Fullscreen button overlay */}
        <IconButton
          onClick={toggleFullscreen}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: '#ffffff',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      </Box>

      {/* Thumbnail navigation */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 2,
          overflowX: 'auto',
          bgcolor: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(255,255,255,0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(255,255,255,0.2)',
            borderRadius: 4,
          },
        }}
      >
        {slides.map((slide, index) => (
          <Box
            key={slide.slideNumber}
            onClick={() => goToSlide(index)}
            sx={{
              minWidth: 100,
              height: 80,
              cursor: 'pointer',
              border: currentSlide === index ? '2px solid #667eea' : '2px solid transparent',
              borderRadius: 0.5,
              overflow: 'hidden',
              opacity: currentSlide === index ? 1 : 0.6,
              transition: 'all 0.2s',
              '&:hover': {
                opacity: 1,
                transform: 'scale(1.05)',
              },
            }}
          >
            <Box
              component="img"
              src={slide.data}
              alt={`Thumbnail ${index + 1}`}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PptxViewer;


