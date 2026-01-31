import React, { useRef, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { SlideImage } from './useContentSlides';

interface SlideThumbnailsProps {
    slides: SlideImage[];
    currentSlide: number;
    onSlideClick: (index: number) => void;
}

const SlideThumbnails: React.FC<SlideThumbnailsProps> = ({ slides, currentSlide, onSlideClick }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const containerRef = useRef<HTMLDivElement>(null);
    const activeThumbRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active thumbnail
    useEffect(() => {
        if (activeThumbRef.current && containerRef.current) {
            const container = containerRef.current;
            const activeThumb = activeThumbRef.current;
            const containerWidth = container.offsetWidth;
            const thumbLeft = activeThumb.offsetLeft;
            const thumbWidth = activeThumb.offsetWidth;
            const scrollLeft = container.scrollLeft;

            // Calculate if thumbnail is outside visible area
            const thumbRight = thumbLeft + thumbWidth;
            const visibleRight = scrollLeft + containerWidth;

            if (thumbLeft < scrollLeft) {
                // Scroll left
                container.scrollTo({
                    left: thumbLeft - 16,
                    behavior: 'smooth'
                });
            } else if (thumbRight > visibleRight) {
                // Scroll right
                container.scrollTo({
                    left: thumbRight - containerWidth + 16,
                    behavior: 'smooth'
                });
            }
        }
    }, [currentSlide]);

    if (slides.length === 0) {
        return null;
    }

    // Fluid responsive thumbnail sizing using clamp()
    // Scale based on viewport height - smaller on short screens, larger on tall screens
    // Mobile: 28-48px, Desktop: 32-64px - more aggressive scaling for short viewports
    const thumbnailHeightValue = isMobile ? 'clamp(28px, 6vh, 48px)' : 'clamp(32px, 7vh, 64px)';
    const thumbnailWidthValue = isMobile ? 'clamp(50px, 10.7vh, 85px)' : 'clamp(57px, 12.4vh, 114px)'; // 16:9 aspect ratio
    const spacing = isMobile ? 6 : 10;

    return (
        <Box
            ref={containerRef}
            sx={{
                display: 'flex',
                gap: `${spacing}px`,
                overflowX: 'auto',
                overflowY: 'hidden',
                flex: 1, // Allow thumbnails to fill available space
                minHeight: 0, // Allow shrinking
                py: 'clamp(4px, 1vh, 12px)', // Fluid vertical padding
                px: 2,
                bgcolor: 'rgba(0,0,0,0.02)',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                // Custom scrollbar
                '&::-webkit-scrollbar': {
                    height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    bgcolor: 'rgba(0,0,0,0.05)',
                    borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                    '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.3)',
                    },
                },
            }}
        >
            {slides.map((slide, index) => {
                // Handle all cases:
                // 1. Azure URLs (http:// or https://) - use directly
                // 2. Data URLs (data:image/...) - use directly  
                // 3. Raw base64 string - add data URL prefix
                const isUrl = slide.data.startsWith('http://') || slide.data.startsWith('https://');
                const isDataUrl = slide.data.startsWith('data:');
                const imgSrc = (isUrl || isDataUrl) ? slide.data : `data:image/png;base64,${slide.data}`;
                
                return (
                    <Box
                        key={`thumbnail-slide-${slide.slideNumber}`}
                        ref={index === currentSlide ? activeThumbRef : null}
                        onClick={() => onSlideClick(index)}
                        sx={{
                            minWidth: thumbnailWidthValue,
                            width: thumbnailWidthValue,
                            height: thumbnailHeightValue,
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            bgcolor: 'white',
                            border: index === currentSlide ? '2px solid #2563eb' : '2px solid rgba(0,0,0,0.12)',
                            boxShadow: index === currentSlide
                                ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                                : '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                            '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                borderColor: index === currentSlide ? '#2563eb' : 'rgba(0,0,0,0.3)',
                            },
                        }}
                    >
                        <Box
                            component="img"
                            src={imgSrc}
                            alt={`Slide ${index + 1}`}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                            onError={(e) => {
                                console.error('Failed to load thumbnail:', index + 1, slide);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                        {/* Slide number badge */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                bgcolor: index === currentSlide ? '#2563eb' : 'rgba(0,0,0,0.6)',
                                color: 'white',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                px: 0.5,
                                py: 0.25,
                                borderRadius: '3px',
                                lineHeight: 1,
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            {index + 1}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export default SlideThumbnails;
