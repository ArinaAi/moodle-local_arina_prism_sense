import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Slider, Menu, MenuItem, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import SpeedIcon from '@mui/icons-material/Speed';

interface VideoViewerProps {
    videoUrl: string;
    title: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ videoUrl, title: _title }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [speedAnchorEl, setSpeedAnchorEl] = useState<null | HTMLElement>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Reset speed when video changes
    useEffect(() => {
        setPlaybackSpeed(1);
        setHasError(false);
        setIsLoading(true);
        if (videoRef.current) {
            videoRef.current.playbackRate = 1;
        }
    }, [videoUrl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) { return; }

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);
        const handleLoadedMetadata = () => setIsLoading(false);
        const handleError = () => { setIsLoading(false); setHasError(true); };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
        };
    }, []);

    // Fullscreen change listener - Simple approach
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Simply check if we're in fullscreen mode
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            const video = videoRef.current;
            if (!video) { return; }

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'spacebar': // For older browsers
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    setCurrentTime(video.currentTime);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    video.currentTime = Math.min(duration, video.currentTime + 10);
                    setCurrentTime(video.currentTime);
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'escape':
                    if (isFullscreen) {
                        e.preventDefault();
                        toggleFullscreen();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, duration, isFullscreen]); // togglePlay and toggleFullscreen are stable

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) { return; }

        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const video = videoRef.current;
        if (!video) { return; }

        const time = newValue as number;
        video.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolumeChange = (event: Event, newValue: number | number[]) => {
        const video = videoRef.current;
        if (!video) { return; }

        const vol = newValue as number;
        video.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) { return; }

        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    // Helper: Exit fullscreen with vendor prefix support
    const exitFullscreenMode = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = document as any;

        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
        }
    };

    // Helper: Enter fullscreen with vendor prefix support
    const enterFullscreenMode = async (container: HTMLDivElement): Promise<boolean> => {
        interface FullscreenElement extends HTMLDivElement {
            webkitRequestFullscreen?: () => Promise<void>;
            msRequestFullscreen?: () => Promise<void>;
        }
        const el = container as FullscreenElement;

        if (el.requestFullscreen) {
            await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            await el.msRequestFullscreen();
        } else {
            return false; // No native fullscreen support
        }
        return true;
    };

    // Helper: Check if device should use CSS-based fullscreen
    const shouldUseCssFullscreen = (): boolean => {
        const mobilePattern = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i;
        return mobilePattern.test(navigator.userAgent);
    };

    const toggleFullscreen = async () => {
        if (isFullscreen || document.fullscreenElement) {
            setIsFullscreen(false);
            try {
                if (document.fullscreenElement) {
                    await exitFullscreenMode();
                }
            } catch (err) {
                console.error('Error exiting fullscreen:', err);
            }
            return;
        }

        // Mobile/tablet: use CSS-based fullscreen
        if (shouldUseCssFullscreen()) {
            setIsFullscreen(true);
            return;
        }

        // Desktop: try native Fullscreen API
        const container = containerRef.current;
        if (!container) {
            setIsFullscreen(true);
            return;
        }

        try {
            const succeeded = await enterFullscreenMode(container);
            if (!succeeded) {
                setIsFullscreen(true);
            }
        } catch (err) {
            console.error('Error entering fullscreen:', err);
            setIsFullscreen(true);
        }
    };

    const togglePictureInPicture = async () => {
        const video = videoRef.current;
        if (!video) { return; }

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP error:', error);
        }
    };

    const handleSpeedChange = (speed: number) => {
        const video = videoRef.current;
        if (!video) { return; }

        video.playbackRate = speed;
        setPlaybackSpeed(speed);
        setSpeedAnchorEl(null);
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) {
            return '0:00';
        }
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Container styles based on fullscreen state
    const getContainerStyles = () => {
        const baseStyles = {
            maxWidth: '100%',
            bgcolor: '#000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
        };

        if (isFullscreen) {
            return {
                ...baseStyles,
                position: 'fixed' as const,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                minHeight: '100vh',
                borderRadius: 0,
                zIndex: 999999,
            };
        }

        return {
            ...baseStyles,
            position: 'relative' as const,
            width: '100%',
            aspectRatio: '16/9',
            minHeight: 'clamp(200px, 40vh, 400px)',
            borderRadius: 1,
        };
    };

    // Loading overlay component
    const renderLoadingOverlay = () => (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 10
            }}
        >
            <CircularProgress size={60} sx={{ color: '#2563eb', mb: 2 }} />
            <Typography variant="body1" sx={{ color: 'white' }}>
                Loading video...
            </Typography>
        </Box>
    );

    // Error overlay component
    const renderErrorOverlay = () => (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 10,
                p: 3,
                textAlign: 'center'
            }}
        >
            <Typography variant="h6" sx={{ color: '#ef4444', mb: 1 }}>
                Video failed to load
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                The video stream could not be loaded. This might be a temporary issue or your API key is missing/incorrect.
            </Typography>
        </Box>
    );

    // Center play button component
    const renderCenterPlayButton = () => (
        <Box
            onClick={togglePlay}
            sx={{
                position: 'absolute',
                width: 'clamp(48px, 15vw, 80px)',
                height: 'clamp(48px, 15vw, 80px)',
                borderRadius: '50%',
                bgcolor: 'rgba(37, 99, 235, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                    bgcolor: '#2563eb',
                    transform: 'scale(1.1)'
                }
            }}
        >
            <PlayArrowIcon sx={{ fontSize: 'clamp(32px, 8vw, 48px)', color: 'white', ml: 0.5 }} />
        </Box>
    );

    // Playback speed menu component
    const renderSpeedMenu = () => (
        <Menu
            anchorEl={speedAnchorEl}
            open={Boolean(speedAnchorEl)}
            onClose={() => setSpeedAnchorEl(null)}
            disablePortal={isFullscreen}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            slotProps={{
                paper: {
                    sx: {
                        color: 'rgb(255, 250, 250)',
                        backdropFilter: 'blur(10px)',
                    }
                }
            }}
            sx={{
                zIndex: 1000001,
                '& .MuiPopover-paper': { position: 'absolute' }
            }}
        >
            {playbackSpeeds.map((speed) => (
                <MenuItem
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    selected={playbackSpeed === speed}
                    sx={{
                        fontSize: '0.9rem',
                        minWidth: '80px',
                        justifyContent: 'center',
                        '&.Mui-selected': {
                            bgcolor: 'rgba(37, 99, 235, 0.3)',
                            '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.4)' }
                        },
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                    }}
                >
                    {speed}x
                </MenuItem>
            ))}
        </Menu>
    );

    // Render the video player content
    const renderVideoPlayer = () => (
        <Box
            ref={containerRef}
            tabIndex={0}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(!isPlaying)}
            sx={getContainerStyles()}
        >
            {isLoading && !hasError && renderLoadingOverlay()}
            {hasError && renderErrorOverlay()}

            <video
                ref={videoRef}
                src={videoUrl}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s'
                }}
                onClick={togglePlay}
            />

            {!isPlaying && renderCenterPlayButton()}

            {/* Controls Overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                    p: 'clamp(8px, 2vw, 16px)',
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 0.3s',
                    pointerEvents: showControls ? 'auto' : 'none'
                }}
            >
                {/* Progress Bar */}
                <Slider
                    value={currentTime}
                    max={duration || 100}
                    onChange={handleSeek}
                    sx={{
                        color: '#2563eb',
                        height: 6,
                        mb: 1,
                        '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                            '&:hover, &.Mui-focusVisible': {
                                boxShadow: '0 0 0 8px rgba(37, 99, 235, 0.16)'
                            }
                        },
                        '& .MuiSlider-rail': {
                            opacity: 0.3,
                            bgcolor: '#fff'
                        }
                    }}
                />

                {/* Control Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
                    <IconButton onClick={togglePlay} sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}>
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>

                    <Typography variant="body2" sx={{ color: 'white', minWidth: 'clamp(80px, 10vw, 100px)', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', width: 'clamp(80px, 15vw, 120px)' }}>
                        <IconButton onClick={toggleMute} sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}>
                            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                        </IconButton>
                        <Slider
                            value={isMuted ? 0 : volume}
                            min={0}
                            max={1}
                            step={0.1}
                            onChange={handleVolumeChange}
                            sx={{
                                color: '#2563eb',
                                ml: 1,
                                '& .MuiSlider-thumb': { width: 12, height: 12 }
                            }}
                        />
                    </Box>

                    <IconButton
                        onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
                        sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}
                    >
                        <SpeedIcon />
                    </IconButton>

                    <IconButton onClick={togglePictureInPicture} sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}>
                        <PictureInPictureAltIcon />
                    </IconButton>

                    <IconButton onClick={toggleFullscreen} sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}>
                        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                </Box>
            </Box>

            {renderSpeedMenu()}
        </Box>
    );

    // Always render inline - the native Fullscreen API or CSS-based fullscreen will handle the overlay
    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            {renderVideoPlayer()}
        </Box>
    );
};

export default VideoViewer;
