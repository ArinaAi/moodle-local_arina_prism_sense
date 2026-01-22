import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, CircularProgress, IconButton, Menu, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
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

// Helper functions moved to module level to reduce cognitive complexity

// Responsive layout styles
const getLayoutStyles = () => ({
    padding: 'clamp(8px, 2vw, 24px)',
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

// Calculate slide max height based on fullscreen state
const getSlideMaxHeight = (isFullscreen: boolean) => {
    if (isFullscreen) { return '100vh'; }
    // Fluid calc: use 100% to fill available space
    return '100%';
};

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

const ContentDisplayArea: React.FC<ContentDisplayAreaProps> = ({
    isVideo,
    videoUrl,
    title,
    isLoading,
    error,
    currentSlideData,
    hasSlides
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Use external helper functions
    const layoutStyles = getLayoutStyles();
    const slideMaxHeight = getSlideMaxHeight(isFullscreen);
    const containerBg = getContainerBg(isVideo);
    const slideCardStyles = getSlideCardStyles(zoomLevel);

    // Fullscreen Change Listener
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

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                if (containerRef.current) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const element = containerRef.current as any;
                    if (element.requestFullscreen) {
                        await element.requestFullscreen();
                    } else if (element.webkitRequestFullscreen) {
                        await element.webkitRequestFullscreen();
                    } else if (element.msRequestFullscreen) {
                        await element.msRequestFullscreen();
                    }
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } else if ((document as any).webkitExitFullscreen) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (document as any).webkitExitFullscreen();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } else if ((document as any).msExitFullscreen) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (document as any).msExitFullscreen();
                }
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
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

    const handleDownload = () => {
        if (!currentSlideData) { return; }

        const link = document.createElement('a');
        link.href = currentSlideData.data;
        link.download = currentSlideData.filename || `slide_${currentSlideData.slideNumber + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleResetView = () => {
        setZoomLevel(1);
        handleMenuClose();
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                flexGrow: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                ...containerBg,
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
                            borderRadius: 1,
                            overflow: 'visible',
                            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
                            transition: 'transform 0.3s ease',
                            transformOrigin: 'center center',
                            zIndex: 1,
                            ...slideCardStyles,
                        }}>
                            <img
                                src={currentSlideData.data}
                                alt={`Slide ${currentSlideData.slideNumber}`}
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: slideMaxHeight,
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}

                    {/* Glass Toolbar (Floating Top-Right) */}
                    {!isLoading && !error && hasSlides && (
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
                                onClick={handleDownload}
                                title="Download Slide"
                            >
                                <DownloadIcon fontSize={layoutStyles.iconSize} />
                            </IconButton>

                            <IconButton
                                size={layoutStyles.iconSize}
                                sx={{
                                    color: '#444746',
                                    ...layoutStyles.touchTarget,
                                }}
                                onClick={toggleFullscreen}
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <FullscreenExitIcon fontSize={layoutStyles.iconSize} /> : <FullscreenIcon fontSize={layoutStyles.iconSize} />}
                            </IconButton>

                            {!isMobile && (
                                <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(0,0,0,0.1)', my: 'auto', mx: 0.5 }} />
                            )}

                            <IconButton
                                size={layoutStyles.iconSize}
                                sx={{
                                    color: '#444746',
                                    ...layoutStyles.touchTarget,
                                }}
                                onClick={handleMenuOpen}
                            >
                                <MoreVertIcon fontSize={layoutStyles.iconSize} />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                            >
                                <MenuItem onClick={handleResetView} disabled={zoomLevel === 1}>
                                    Reset View
                                </MenuItem>
                            </Menu>
                        </Box>
                    )}
                </Box>
            )
            }
        </Box >
    );
};

export default ContentDisplayArea;
