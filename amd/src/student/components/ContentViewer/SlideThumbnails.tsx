import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { SlideImage } from './useContentSlides';

interface SlideThumbnailsProps {
    slides: SlideImage[];
    currentSlide: number;
    onSlideClick: (index: number) => void;
    onSasExpired?: () => void;
}

// --- LazyThumb ---

interface LazyThumbProps {
    slide: SlideImage;
    index: number;
    isActive: boolean;
    onClick: () => void;
    scrollContainer: HTMLElement | null; // nullable — null on first render
    onSasExpired?: () => void;
    thumbnailWidth: string;
    thumbnailHeight: string;
}

const LazyThumb: React.FC<LazyThumbProps> = ({
    slide, index, isActive, onClick, scrollContainer, onSasExpired, thumbnailWidth, thumbnailHeight
}) => {
    // First 5 thumbnails load immediately; rest are lazy
    const [visible, setVisible] = useState(index < 5);
    const thumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible || !scrollContainer) { return; } // skip if already visible or container not ready
        const el = thumbRef.current;
        if (!el) { return; }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            {
                root: scrollContainer, // the scroll strip, not the viewport
                threshold: 0,
                rootMargin: '0px 200px', // preload 200 px before entering view
            }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // Note: `visible` is intentionally never reset when `slide.data` changes.
        // On SAS refresh the parent replaces the slides array with new URLs; React
        // reuses this component instance (key is stable), `visible` stays true, and
        // the img re-renders with the new URL automatically. No reset needed.
    }, [visible, scrollContainer]);

    const isUrl = slide.data.startsWith('http://') || slide.data.startsWith('https://');
    const isDataUrl = slide.data.startsWith('data:');
    const imgSrc = (isUrl || isDataUrl) ? slide.data : `data:image/png;base64,${slide.data}`;

    return (
        <Box
            ref={thumbRef}
            data-active={isActive ? 'true' : undefined}
            onClick={onClick}
            sx={{
                minWidth: thumbnailWidth,
                width: thumbnailWidth,
                height: thumbnailHeight,
                position: 'relative',
                cursor: 'pointer',
                borderRadius: '4px',
                overflow: 'hidden',
                bgcolor: 'white',
                border: isActive ? '2px solid #2563eb' : '2px solid rgba(0,0,0,0.12)',
                boxShadow: isActive
                    ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                    : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                    borderColor: isActive ? '#2563eb' : 'rgba(0,0,0,0.3)',
                },
            }}
        >
            {visible && (
                <Box
                    component="img"
                    src={imgSrc}
                    alt={`Slide ${index + 1}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                        onSasExpired?.();
                    }}
                />
            )}
            {/* Slide number badge */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    bgcolor: isActive ? '#2563eb' : 'rgba(0,0,0,0.6)',
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
};

// --- SlideThumbnails ---

const SlideThumbnails: React.FC<SlideThumbnailsProps> = ({ slides, currentSlide, onSlideClick, onSasExpired }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // scrollContainer drives both auto-scroll (via containerRef) and IntersectionObserver
    // (passed as a prop to LazyThumb). A single setState callback sets both at once.
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

    const setContainerRef = useCallback((el: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setScrollContainer(el);
    }, []);

    // Auto-scroll to keep the active thumbnail visible
    useEffect(() => {
        const container = containerRef.current;
        if (!container) { return; }
        const activeThumb = container.querySelector('[data-active="true"]') as HTMLElement | null;
        if (!activeThumb) { return; }

        const containerWidth = container.offsetWidth;
        const thumbLeft = activeThumb.offsetLeft;
        const thumbWidth = activeThumb.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const thumbRight = thumbLeft + thumbWidth;
        const visibleRight = scrollLeft + containerWidth;

        if (thumbLeft < scrollLeft) {
            container.scrollTo({ left: thumbLeft - 16, behavior: 'smooth' });
        } else if (thumbRight > visibleRight) {
            container.scrollTo({ left: thumbRight - containerWidth + 16, behavior: 'smooth' });
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
            ref={setContainerRef}
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
            {slides.map((slide, index) => (
                <LazyThumb
                    key={`thumbnail-slide-${slide.slideNumber}`}
                    slide={slide}
                    index={index}
                    isActive={index === currentSlide}
                    onClick={() => onSlideClick(index)}
                    scrollContainer={scrollContainer}
                    onSasExpired={onSasExpired}
                    thumbnailWidth={thumbnailWidthValue}
                    thumbnailHeight={thumbnailHeightValue}
                />
            ))}
        </Box>
    );
};

export default SlideThumbnails;
