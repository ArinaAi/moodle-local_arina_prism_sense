import React from 'react';

interface SparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color,
    width: W = 100,
    height: H = 36,
}) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data.map((v, i) => [
        (i / (data.length - 1)) * W,
        H - ((v - min) / range) * (H - 4) - 2,
    ]);

    const linePath = 'M' + pts.map(([x, y]) => `${x},${y}`).join(' L');
    const areaPath = `M0,${H} L${pts.map(([x, y]) => `${x},${y}`).join(' L')} L${W},${H} Z`;
    const gradId = `sg${color.replace(/[^a-z0-9]/gi, '')}`;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: H, display: 'block' }}
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
