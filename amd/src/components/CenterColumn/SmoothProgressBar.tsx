import React, { useEffect, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

type ProcessingStatus =
    | 'queued' | 'pending' | 'processing'
    | 'toc_generation' | 'toc_completed'
    | 'lecture_generation' | 'lecture_completed'
    | 'slides_generation' | 'slides_completed'
    | 'audio_completed' | 'video_completed'
    | null;

interface SmoothProgressBarProps {
    processingStatus: ProcessingStatus;
    startTime?: number;
}

// Map status to target progress percentage
const getTargetProgress = (status: ProcessingStatus): number => {
    switch (status) {
        case null:
        case 'queued':
        case 'pending':
            return 5;
        case 'processing':
        case 'toc_generation':
            return 15;
        case 'toc_completed':
        case 'lecture_generation':
            return 35; // Lecture starts here, will creep to 80
        case 'lecture_completed':
        case 'slides_generation':
        case 'audio_completed':
            return 85;
        case 'slides_completed':
        case 'video_completed':
            return 98;
        default:
            return 10;
    }
};

// Check if status is in lecture phase (long-running)
const isInLecturePhase = (status: ProcessingStatus): boolean => {
    return status === 'toc_completed' || status === 'lecture_generation';
};

const SmoothProgressBar: React.FC<SmoothProgressBarProps> = ({
    processingStatus,
    startTime: _startTime
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [progress, setProgress] = useState(5);
    const targetProgress = getTargetProgress(processingStatus);
    const isLecturePhase = isInLecturePhase(processingStatus);

    // Effect 1: Jump to target progress when status changes
    useEffect(() => {
        // Quickly animate to target
        const jumpToTarget = () => {
            setProgress(prev => {
                const diff = targetProgress - prev;
                if (Math.abs(diff) < 1) {
                    return targetProgress;
                }
                // Fast progress: move 20% of remaining distance per frame
                return prev + diff * 0.2;
            });
        };

        const interval = setInterval(jumpToTarget, 50);

        // Stop after reaching target
        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [targetProgress]);

    // Effect 2: Slow creep during lecture phase (35% -> 80% over 15 minutes)
    useEffect(() => {
        if (!isLecturePhase) {
            return;
        }

        // Creep interval: increment every 2 seconds
        // 80 - 35 = 45 percentage points over 15 min = 900 seconds
        // 45 / (900 / 2) = 0.1 per tick
        const creepInterval = setInterval(() => {
            setProgress(prev => {
                // Only creep if we're past the initial target and below 80%
                if (prev >= 35 && prev < 80) {
                    return Math.min(prev + 0.1, 80);
                }
                return prev;
            });
        }, 2000);

        return () => {
            clearInterval(creepInterval);
        };
    }, [isLecturePhase]);

    const barHeight = isMobile ? 6 : 8;
    const borderRadius = barHeight / 2;

    return (
        <Box sx={{
            width: '100%',
            maxWidth: isMobile ? '100%' : 500,
            mx: 'auto',
            py: isMobile ? 1 : 1.5,
            marginTop: isMobile ? 1 : 2,
        }}>
            {/* Progress Bar Container */}
            <Box sx={{
                width: '100%',
                height: barHeight,
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Animated Fill */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
                    borderRadius: `${borderRadius}px`,
                    transition: 'width 0.3s ease-out',
                    // Shimmer effect
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        animation: 'shimmer 2s infinite',
                    },
                    '@keyframes shimmer': {
                        '0%': { transform: 'translateX(-100%)' },
                        '100%': { transform: 'translateX(100%)' },
                    },
                }} />
            </Box>

            {/* Percentage indicator */}
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    textAlign: 'center',
                    mt: 0.75,
                    color: 'text.secondary',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    fontWeight: 500,
                }}
            >
                {Math.round(progress)}%
            </Typography>
        </Box>
    );
};

export default SmoothProgressBar;
