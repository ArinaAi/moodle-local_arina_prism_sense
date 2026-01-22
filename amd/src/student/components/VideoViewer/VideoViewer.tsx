import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Slider, Menu, MenuItem } from '@mui/material';
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

    const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    useEffect(() => {
        const video = videoRef.current;
        if (!video) { return; }

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

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

    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) { return; }

        if (!isFullscreen) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
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
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box
            ref={containerRef}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(isPlaying ? false : true)}
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={videoUrl}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
                onClick={togglePlay}
            />

            {/* Center Play Button (when paused) */}
            {!isPlaying && (
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
            )}

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
                    {/* Play/Pause */}
                    <IconButton onClick={togglePlay} sx={{ color: 'white', padding: 'clamp(4px, 1vw, 8px)' }}>
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>

                    {/* Time Display */}
                    <Typography variant="body2" sx={{ color: 'white', minWidth: 'clamp(80px, 10vw, 100px)', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    {/* Volume */}
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
                                '& .MuiSlider-thumb': {
                                    width: 12,
                                    height: 12
                                }
                            }}
                        />
                    </Box>

                    {/* Playback Speed */}
                    <IconButton
                        onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
                        sx={{ color: 'white' }}
                    >
                        <SpeedIcon />
                    </IconButton>
                    <Menu
                        anchorEl={speedAnchorEl}
                        open={Boolean(speedAnchorEl)}
                        onClose={() => setSpeedAnchorEl(null)}
                    >
                        {playbackSpeeds.map((speed) => (
                            <MenuItem
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                selected={playbackSpeed === speed}
                            >
                                {speed}x
                            </MenuItem>
                        ))}
                    </Menu>

                    {/* Picture-in-Picture */}
                    <IconButton onClick={togglePictureInPicture} sx={{ color: 'white' }}>
                        <PictureInPictureAltIcon />
                    </IconButton>

                    {/* Fullscreen */}
                    <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default VideoViewer;
