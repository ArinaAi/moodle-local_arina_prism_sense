import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Check, Circle } from 'lucide-react';

interface ThoughtStreamProps {
    isActive: boolean;
}

const THOUGHTS = [
    "Initializing AI context...",
    "Analyzing source documents...",
    "Identifying key concepts...",
    "Structuring lecture flow...",
    "Drafting slide content...",
    "Synthesizing summary points...",
    "Optimizing reading flow...",
    "Finalizing formatting...",
];

const ThoughtStream: React.FC<ThoughtStreamProps> = ({ isActive }) => {
    // Use index-based tracking for easier animation math
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setActiveIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setActiveIndex((prev) => {
                if (prev < THOUGHTS.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 2500);

        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) {
        return null;
    }

    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: 400,
                mx: 'auto',
                height: 120, // Compact height for focused view
                position: 'relative',
                display: 'flex',
                alignItems: 'center', // Vertically center content
                justifyContent: 'center',
                overflow: 'hidden',
                mt: 3,
                maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
            }}
        >
            {THOUGHTS.map((thought, index) => {
                const offset = index - activeIndex;
                const isActiveItem = index === activeIndex;

                // Only render items relevant to the animation (current and recent past)
                if (index > activeIndex || index < activeIndex - 2) {
                    return null;
                }

                return (
                    <Box
                        key={thought}
                        sx={{
                            position: 'absolute',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                            transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            // Animation logic based on offset
                            opacity: isActiveItem ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.5), // Slower fade
                            // Instead of scaling down ("moving back"), just move up
                            transform: `translateY(${offset * 25}px)`, // Tighter vertical spacing
                            filter: isActiveItem ? 'none' : `blur(${Math.abs(offset) * 1}px)`, // Reduced blur
                            zIndex: isActiveItem ? 2 : 1,
                            pointerEvents: 'none',
                        }}
                    >
                        <Box
                            sx={{
                                color: isActiveItem ? 'primary.main' : 'text.disabled',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.5s ease',
                            }}
                        >
                            {isActiveItem ? (
                                <Circle size={10} fill="currentColor" className="pulse-dot" />
                            ) : (
                                <Check size={14} strokeWidth={2} />
                            )}
                        </Box>
                        <Typography
                            variant="body1"
                            sx={{
                                color: isActiveItem ? 'text.primary' : 'text.disabled',
                                fontWeight: 400, // Standard weight as requested
                                fontSize: isActiveItem ? '1rem' : '0.9rem',
                                fontFamily: '"Inter", sans-serif',
                                textAlign: 'center',
                                transition: 'all 0.5s ease',
                            }}
                        >
                            {thought}
                        </Typography>
                    </Box>
                );
            })}

            <style>
                {`
          @keyframes pulse-dot {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
          }
          .pulse-dot {
            animation: pulse-dot 1.5s infinite ease-in-out;
          }
        `}
            </style>
        </Box>
    );
};

export default ThoughtStream;