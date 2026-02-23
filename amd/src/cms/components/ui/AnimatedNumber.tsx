import React, { useState, useEffect } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    duration = 700,
}) => {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const start = performance.now();
        const from = display;

        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            // Quartic ease-out
            const eased = 1 - Math.pow(1 - p, 4);
            setDisplay(Math.round(from + (value - from) * eased));
            if (p < 1) { requestAnimationFrame(tick); }
        };

        requestAnimationFrame(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {display.toLocaleString()}
        </span>
    );
};
