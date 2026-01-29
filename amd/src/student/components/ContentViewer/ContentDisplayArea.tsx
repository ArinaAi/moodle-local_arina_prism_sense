import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { SlideImage } from './useContentSlides';
import SlideThumbnails from './SlideThumbnails';

interface ContentDisplayAreaProps {
    isVideo: boolean;
    isLoading: boolean;
    error: string | null;
    currentSlideData: SlideImage | undefined;
    hasSlides: boolean;
    // Navigation props for fullscreen mode
    slides?: SlideImage[];
    currentSlide?: number;
    onNext?: () => void;
    onPrev?: () => void;
    onSlideClick?: (index: number) => void;
}

// Helper functions moved to module level to reduce cognitive complexity

// Responsive layout styles
const getLayoutStyles = () => ({
    padding: 'clamp(4px, 1vw, 12px)',
    toolbarTop: 'clamp(6px, 1.5vw, 16px)',
    toolbarRight: 'clamp(6px, 1.5vw, 16px)',
    toolbarGap: 'clamp(2px, 0.5vw, 6px)',
    toolbarRadius: 'clamp(6px, 1vw, 10px)',
    toolbarPadding: 'clamp(2px, 0.5vw, 4px)',
    iconSize: 'small' as const,
    touchTarget: {
        minWidth: 'clamp(28px, 4vw, 36px)',
        minHeight: 'clamp(28px, 4vw, 36px)',
        padding: 'clamp(4px, 0.5vw, 6px)',
    },
});

// Container background styles based on content type
const getContainerBg = (isVideo: boolean) => ({
    bgcolor: isVideo ? '#000' : '#f0f4f8',
    background: isVideo ? '#000' : 'linear-gradient(180deg, #f0f4f8 0%, #eef2f6 100%)',
});

// Slide card styles based on zoom level
const getSlideCardStyles = (zoomLevel: number) => ({
    transform: `scale(${zoomLevel})`,
    cursor: zoomLevel > 1 ? 'grab' : 'default',
    '&:hover': {
        boxShadow: zoomLevel === 1 ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
    },
});

// Container styles based on fullscreen state
const getContainerStyles = (isFullscreen: boolean, containerBg: ReturnType<typeof getContainerBg>) => ({
    flexGrow: 1,
    position: isFullscreen ? 'fixed' as const : 'relative' as const,
    top: isFullscreen ? 0 : undefined,
    left: isFullscreen ? 0 : undefined,
    right: isFullscreen ? 0 : undefined,
    bottom: isFullscreen ? 0 : undefined,
    width: isFullscreen ? '100vw' : undefined,
    height: isFullscreen ? '100vh' : undefined,
    maxWidth: isFullscreen ? '100vw' : undefined,
    maxHeight: isFullscreen ? '100vh' : undefined,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    ...containerBg,
    bgcolor: isFullscreen ? '#000' : containerBg.bgcolor,
    background: isFullscreen ? '#000' : containerBg.background,
    m: 0,
    zIndex: isFullscreen ? 999999 : undefined,
});

// Keyboard action map for fullscreen mode
type KeyboardAction = 'next' | 'prev' | 'exit' | 'toggleThumbnails' | null;
const getKeyboardAction = (key: string): KeyboardAction => {
    const keyMap: Record<string, KeyboardAction> = {
        'ArrowRight': 'next',
        ' ': 'next',
        'ArrowLeft': 'prev',
        'Escape': 'exit',
        't': 'toggleThumbnails',
        'T': 'toggleThumbnails',
    };
    return keyMap[key] ?? null;
};

// Process touch swipe and return direction
const getSwipeDirection = (startX: number, endX: number, threshold = 50): 'left' | 'right' | null => {
    const diff = startX - endX;
    if (Math.abs(diff) <= threshold) { return null; }
    return diff > 0 ? 'left' : 'right';
};

const ContentDisplayArea: React.FC<ContentDisplayAreaProps> = ({
    isVideo,
    isLoading,
    error,
    currentSlideData,
    hasSlides,
    slides = [],
    currentSlide = 0,
    onNext,
    onPrev,
    onSlideClick
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showThumbnails, setShowThumbnails] = useState(false);
    
    // Touch handling state
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    // Use external helper functions
    const layoutStyles = getLayoutStyles();
    const containerBg = getContainerBg(isVideo);
    const slideCardStyles = getSlideCardStyles(zoomLevel);

    // Fullscreen Change Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Simply check if our container is the fullscreen element
            const isNowFullscreen = document.fullscreenElement === containerRef.current;
            setIsFullscreen(isNowFullscreen);
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

    // Keyboard navigation - using action map to reduce complexity
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isFullscreen) { return; }
        
        const action = getKeyboardAction(e.key);
        if (!action) { return; }
        
        e.preventDefault();
        const actions: Record<KeyboardAction & string, () => void> = {
            next: () => onNext?.(),
            prev: () => onPrev?.(),
            exit: () => exitFullscreen(),
            toggleThumbnails: () => setShowThumbnails(prev => !prev),
        };
        actions[action]();
    }, [isFullscreen, onNext, onPrev]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Touch swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const direction = getSwipeDirection(touchStartX.current, touchEndX.current);
        if (direction === 'left') {
            onNext?.();
        } else if (direction === 'right') {
            onPrev?.();
        }
        // Reset
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    const enterFullscreen = async () => {
        // On mobile/tablet or iOS, use CSS-based fullscreen with portal
        // as Fullscreen API is often restricted or unavailable
        const isMobileOrTablet = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isMobileOrTablet || isIOS) {
            // Use CSS-based fullscreen with portal for mobile devices
            setIsFullscreen(true);
            
            // Try to lock orientation on mobile (optional)
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const screen = window.screen as any;
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape').catch(() => {
                        // Landscape lock failed, continue anyway
                    });
                }
            } catch {
                // Orientation lock not supported - that's OK
            }
            return;
        }
        
        // For desktop, try native Fullscreen API
        const element = containerRef.current;
        if (!element) {
            // Fallback to CSS-based fullscreen
            setIsFullscreen(true);
            return;
        }
        
        // Vendor-prefixed fullscreen methods for cross-browser support
        interface FullscreenElement extends HTMLDivElement {
            webkitRequestFullscreen?: () => Promise<void>;
            webkitEnterFullscreen?: () => Promise<void>;
            msRequestFullscreen?: () => Promise<void>;
        }
        const el = element as FullscreenElement;
        
        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                // Safari
                await el.webkitRequestFullscreen();
            } else if (el.msRequestFullscreen) {
                // IE11
                await el.msRequestFullscreen();
            } else {
                // Fallback to CSS-based fullscreen
                setIsFullscreen(true);
            }
        } catch (err) {
            console.error('Error entering fullscreen:', err);
            // Fallback: use CSS-based fullscreen
            setIsFullscreen(true);
        }
    };

    const exitFullscreen = async () => {
        // First, exit CSS-based fullscreen
        setIsFullscreen(false);
        setShowThumbnails(false);
        
        // Then try to exit native fullscreen API if active
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const doc = document as any;
            
            if (document.fullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (doc.webkitExitFullscreen) {
                    await doc.webkitExitFullscreen();
                } else if (doc.msExitFullscreen) {
                    await doc.msExitFullscreen();
                }
            }
            
            // Unlock orientation
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const screen = window.screen as any;
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            } catch {
                // Ignore
            }
        } catch (err) {
            console.error('Error exiting fullscreen:', err);
        }
    };

    const handleZoomIn = () => {
        // Cycle zoom levels: 1 -> 1.25 -> 1.5 -> 2 -> 1
        setZoomLevel(prev => {
            if (prev >= 2) { return 1; }
            if (prev >= 1.5) { return 2; }
            if (prev >= 1.25) { return 1.5; }
            return 1.25;
        });
    };

    const containerStyles = getContainerStyles(isFullscreen, containerBg);

    // Render fullscreen content - the main content area
    const renderContent = () => (
        <Box
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={containerStyles}>

            {/* Slide Preview Area */}
            <Box sx={{
                position: 'relative',
                // Conditional height: fullscreen uses full viewport, normal mode is clamped
                height: isFullscreen ? '100%' : 'clamp(200px, 50vh, 90vh)',
                maxHeight: isFullscreen ? '100%' : 'calc(100% - 250px)', // Leave room for footer in normal mode
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                p: layoutStyles.padding,
                overflow: 'auto',
                perspective: '1000px',
                WebkitOverflowScrolling: 'touch',
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
                            minHeight: 0, // Allow shrinking
                            borderRadius: 1,
                            overflow: 'visible',
                            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
                            transition: 'transform 0.3s ease',
                            transformOrigin: 'center center',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...slideCardStyles,
                        }}>
                            <img
                                src={currentSlideData.data}
                                alt={`Slide ${currentSlideData.slideNumber}`}
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}

                    {/* Glass Toolbar (Floating Top-Right) */}
                    {!isLoading && !error && hasSlides && !isFullscreen && (
                        <Box sx={{
                            position: 'absolute',
                            top: layoutStyles.toolbarTop,
                            right: layoutStyles.toolbarRight,
                            zIndex: 10,
                            display: 'flex',
                            gap: layoutStyles.toolbarGap,
                            bgcolor: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: layoutStyles.toolbarRadius,
                            p: layoutStyles.toolbarPadding,
                            border: '1px solid rgba(255,255,255,0.5)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                        }}>
                            <IconButton
                                size={layoutStyles.iconSize}
                                sx={{
                                    color: zoomLevel > 1 ? '#2563eb' : '#444746',
                                    ...layoutStyles.touchTarget,
                                }}
                                onClick={handleZoomIn}
                                title={zoomLevel > 1 ? `Zoom: ${zoomLevel}x` : "Zoom In"}
                            >
                                <ZoomInIcon fontSize={layoutStyles.iconSize} />
                            </IconButton>

                            <IconButton
                                size={layoutStyles.iconSize}
                                sx={{
                                    color: '#444746',
                                    ...layoutStyles.touchTarget,
                                }}
                                onClick={enterFullscreen}
                                title="Fullscreen"
                            >
                                <FullscreenIcon fontSize={layoutStyles.iconSize} />
                            </IconButton>
                        </Box>
                    )}

                    {/* Fullscreen Navigation Controls */}
                    {isFullscreen && (
                        <>
                            {/* Close button - top right */}
                            <IconButton
                                onClick={exitFullscreen}
                                sx={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    zIndex: 20,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                }}
                            >
                                <CloseIcon />
                            </IconButton>

                            {/* Previous button - left side */}
                            {onPrev && currentSlide > 0 && (
                                <IconButton
                                    onClick={onPrev}
                                    sx={{
                                        position: 'absolute',
                                        left: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 20,
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        width: 48,
                                        height: 48,
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                    }}
                                >
                                    <ChevronLeftIcon fontSize="large" />
                                </IconButton>
                            )}

                            {/* Next button - right side */}
                            {onNext && currentSlide < slides.length - 1 && (
                                <IconButton
                                    onClick={onNext}
                                    sx={{
                                        position: 'absolute',
                                        right: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 20,
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        width: 48,
                                        height: 48,
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                    }}
                                >
                                    <ChevronRightIcon fontSize="large" />
                                </IconButton>
                            )}

                            {/* Slide counter - bottom center */}
                            <Box
                                onClick={() => setShowThumbnails(prev => !prev)}
                                sx={{
                                    position: 'absolute',
                                    bottom: showThumbnails ? 100 : 24,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 20,
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'bottom 0.3s ease',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                                }}
                            >
                                {currentSlide + 1} / {slides.length}
                                <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                    (tap for thumbnails)
                                </Typography>
                            </Box>

                            {/* Thumbnails panel - bottom */}
                            {showThumbnails && onSlideClick && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        zIndex: 15,
                                        bgcolor: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <SlideThumbnails
                                        slides={slides}
                                        currentSlide={currentSlide}
                                        onSlideClick={(index) => {
                                            onSlideClick(index);
                                        }}
                                    />
                                </Box>
                            )}
                        </>
                    )}
            </Box>
        </Box>
    );

    // When in fullscreen mode, render using a portal to document.body
    // This ensures it overlays everything, including parent containers
    if (isFullscreen) {
        return createPortal(renderContent(), document.body);
    }

    // Normal mode - render inline with a ref on the wrapper for fullscreen API
    return (
        <Box ref={containerRef}>
            {renderContent()}
        </Box>
    );
};

export default ContentDisplayArea;
