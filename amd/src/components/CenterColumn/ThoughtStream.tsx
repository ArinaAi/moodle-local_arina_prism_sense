import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Check, Loader2 } from 'lucide-react';

type ProcessingStatus =
    | 'queued' | 'pending' | 'processing'
    | 'toc_generation' | 'toc_completed'
    | 'lecture_generation' | 'lecture_completed'
    | 'slides_generation' | 'slides_completed'
    | null;

interface ThoughtStreamProps {
    processingStatus: ProcessingStatus;
    isVideo?: boolean;
}

interface Step {
    id: string;
    label: string;
    subMessages?: string[];
}

const SLIDE_STEPS: Step[] = [
    { id: 'init', label: 'Initializing generation' },
    { id: 'toc', label: 'Creating table of contents' },
    {
        id: 'lecture',
        label: 'Generating lecture content',
        subMessages: [
            'Analyzing document structure',
            'Creating section narratives',
            'Building slide content',
            'Organizing key concepts',
            'Structuring visual elements',
            'Refining content flow',
        ]
    },
    { id: 'slides', label: 'Creating slide images' },
];

const VIDEO_STEPS: Step[] = [
    { id: 'init', label: 'Initializing generation' },
    { id: 'toc', label: 'Creating table of contents' },
    {
        id: 'lecture',
        label: 'Generating video content',
        subMessages: [
            'Analyzing document structure',
            'Creating video narrative',
            'Building presentation flow',
            'Organizing key concepts',
            'Preparing visual elements',
            'Refining content sequence',
        ]
    },
    { id: 'render', label: 'Rendering video' },
];

// Helper functions to reduce cognitive complexity in render
const getContainerStyles = (isMobile: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    py: isMobile ? 1.5 : 2,
    minHeight: isMobile ? 80 : 100,
    marginTop: isMobile ? 1 : 3,
});

const getCompletedLabelFontSize = (isMobile: boolean) =>
    isMobile ? '0.7rem' : '0.75rem';

const getActiveLabelFontSize = (isMobile: boolean) =>
    isMobile ? '0.75rem' : '0.85rem';

const getSubMessageFontSize = (isMobile: boolean) =>
    isMobile ? '0.65rem' : '0.7rem';

const getIconSize = (isMobile: boolean) => (isMobile ? 15 : 17);

// Map backend status to step index
const getStepIndex = (status: ProcessingStatus): number => {
    switch (status) {
        case null:
        case 'queued':
        case 'pending':
            return 0; // init
        case 'processing':
        case 'toc_generation':
            return 1; // toc
        case 'toc_completed':
        case 'lecture_generation':
            return 2; // lecture
        case 'lecture_completed':
        case 'slides_generation':
            return 3; // slides
        case 'slides_completed':
            return 4; // done
        default:
            return 0;
    }
};

const ThoughtStream: React.FC<ThoughtStreamProps> = ({
    processingStatus,
    isVideo = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const steps = isVideo ? VIDEO_STEPS : SLIDE_STEPS;

    // Track completed steps for fade-out display
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [showInit, setShowInit] = useState(true);
    const [subMessageIndex, setSubMessageIndex] = useState(0);
    const initTimerRef = useRef<NodeJS.Timeout | null>(null);
    const subMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

    const currentStepIndex = getStepIndex(processingStatus);

    // Always show "Initializing" for at least 2 seconds on mount
    useEffect(() => {
        initTimerRef.current = setTimeout(() => {
            setShowInit(false);
        }, 2000);

        return () => {
            if (initTimerRef.current) {
                clearTimeout(initTimerRef.current);
            }
        };
    }, []);

    // Rotate sub-messages during lecture generation
    useEffect(() => {
        const effectiveIndex = showInit && currentStepIndex === 0 ? 0 : currentStepIndex;
        const activeStep = effectiveIndex < steps.length ? steps[effectiveIndex] : null;

        if (activeStep?.subMessages && activeStep.subMessages.length > 0) {
            // Reset index when entering lecture step
            setSubMessageIndex(0);

            subMessageTimerRef.current = setInterval(() => {
                setSubMessageIndex(prev =>
                    (prev + 1) % (activeStep.subMessages?.length || 1)
                );
            }, 8000); // Rotate every 8 seconds
        }

        return () => {
            if (subMessageTimerRef.current) {
                clearInterval(subMessageTimerRef.current);
            }
        };
    }, [currentStepIndex, showInit, steps]);

    // Update completed steps when status progresses
    useEffect(() => {
        const newCompleted: string[] = [];
        for (let i = 0; i < currentStepIndex && i < steps.length; i++) {
            newCompleted.push(steps[i].id);
        }
        setCompletedSteps(newCompleted);
    }, [currentStepIndex, steps]);

    // Determine what to show
    const effectiveStepIndex = showInit && currentStepIndex === 0 ? 0 : currentStepIndex;
    const activeStep = effectiveStepIndex < steps.length ? steps[effectiveStepIndex] : steps[steps.length - 1];
    const isActiveSpinning = effectiveStepIndex < steps.length;

    // Get current sub-message if available
    const currentSubMessage = activeStep.subMessages && activeStep.subMessages.length > 0
        ? activeStep.subMessages[subMessageIndex % activeStep.subMessages.length]
        : null;

    return (
        <Box sx={getContainerStyles(isMobile)}>
            {/* Completed steps - fade into background */}
            {completedSteps.length > 0 && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    mb: 1,
                }}>
                    {completedSteps.slice(-2).map((stepId, idx) => {
                        const step = steps.find(s => s.id === stepId);
                        if (!step) {
                            return null;
                        }
                        const fadeAmount = (completedSteps.length - idx - 1) * 0.3;
                        return (
                            <Box
                                key={stepId}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    opacity: Math.max(0.3, 0.6 - fadeAmount),
                                    transition: 'opacity 0.5s ease',
                                    py: 0.25,
                                }}
                            >
                                <Check size={14} color="#22c55e" strokeWidth={2.5} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.disabled',
                                        fontSize: getCompletedLabelFontSize(isMobile),
                                    }}
                                >
                                    {step.label}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Current active step - prominent */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}>
                    {isActiveSpinning ? (
                        <Loader2
                            size={getIconSize(isMobile)}
                            color="#2563eb"
                            style={{ animation: 'spin 1s linear infinite' }}
                        />
                    ) : (
                        <Check size={getIconSize(isMobile)} color="#22c55e" strokeWidth={2.5} />
                    )}
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'text.primary',
                            fontWeight: 500,
                            fontSize: getActiveLabelFontSize(isMobile),
                        }}
                    >
                        {activeStep.label}{isActiveSpinning ? '...' : ''}
                    </Typography>
                </Box>

                {/* Sub-message for long-running steps */}
                {currentSubMessage && isActiveSpinning && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontSize: getSubMessageFontSize(isMobile),
                            fontStyle: 'italic',
                            opacity: 0.8,
                            transition: 'opacity 0.3s ease',
                            animation: 'fadeInOut 8s ease-in-out infinite',
                            '@keyframes fadeInOut': {
                                '0%, 100%': { opacity: 0.4 },
                                '15%, 85%': { opacity: 0.9 },
                            },
                        }}
                    >
                        → {currentSubMessage}
                    </Typography>
                )}
            </Box>

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </Box>
    );
};

export default ThoughtStream;