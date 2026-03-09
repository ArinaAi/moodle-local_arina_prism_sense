import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeltaBadgeProps {
    /** The numeric change. Positive = green (+N), negative = red (−N), 0/null = hidden */
    delta: number | null;
    /** Size variant: 'card' for stat cards, 'header' for the compact header display */
    size?: 'card' | 'header';
}

// How long (ms) the badge stays visible before fading out
const VISIBLE_DURATION_MS = 1000;
// Exit animation duration (ms) — must match the exit transition below
const EXIT_DURATION_MS = 400;

/**
 * Transient delta badge that appears, stays for ~1s, then fades/floats away.
 * Keyed by timestamp so it re-triggers even for consecutive equal deltas.
 */
export const DeltaBadge: React.FC<DeltaBadgeProps> = ({ delta, size = 'card' }) => {
    const [entry, setEntry] = useState<{ key: number; delta: number } | null>(null);

    useEffect(() => {
        // eslint-disable-next-line eqeqeq
        if (delta == null || delta === 0) { return; }

        const key = Date.now();
        setEntry({ key, delta });

        // After visible duration, clear entry → AnimatePresence plays exit animation
        const id = setTimeout(() => {
            setEntry(null);
        }, VISIBLE_DURATION_MS + EXIT_DURATION_MS);

        return () => clearTimeout(id);
    }, [delta]);

    const isCard = size === 'card';

    return (
        <AnimatePresence mode="wait">
            {entry && (
                <motion.span
                    key={entry.key}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: isCard ? -4 : -2 }}
                    exit={{ opacity: 0, y: isCard ? -12 : -8 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        display: 'inline-block',
                        fontSize: isCard ? '0.8125rem' : '0.6875rem',
                        fontWeight: 700,
                        color: entry.delta > 0 ? '#28a745' : '#dc3545',
                        fontVariantNumeric: 'tabular-nums',
                        marginLeft: isCard ? 6 : 4,
                        letterSpacing: '-0.01em',
                        lineHeight: 1,
                        verticalAlign: 'middle',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    {entry.delta > 0 ? '+' : ''}{entry.delta.toLocaleString()}
                </motion.span>
            )}
        </AnimatePresence>
    );
};
