import React from 'react';
import { motion } from 'framer-motion';
import type { DonutSegment } from '../../config/mockData';

interface BreakdownPanelProps {
    data: DonutSegment[];
}

export const BreakdownPanel: React.FC<BreakdownPanelProps> = ({ data }) => {
    const total = data.reduce((a, b) => a + b.value, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--ts)',
                    marginBottom: 12,
                }}
            >
                Breakdown
            </div>

            {data.map((item, i) => {
                const pct = Math.round((item.value / total) * 100);
                return (
                    <div
                        key={item.name}
                        style={{
                            paddingTop: i === 0 ? 0 : 14,
                            paddingBottom: 14,
                            borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                    >
                        {/* Row: name + value + badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: 3,
                                        background: item.color,
                                        flexShrink: 0,
                                    }}
                                />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tp)' }}>
                                    {item.name}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--ts)' }}>
                                    {item.value.toLocaleString()} cr
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: item.color,
                                        background: `${item.color}18`,
                                        padding: '2px 9px',
                                        borderRadius: 9999,
                                    }}
                                >
                                    {pct}%
                                </span>
                            </div>
                        </div>

                        {/* Animated progress bar */}
                        <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                    delay: 0.3 + i * 0.1,
                                    duration: 0.6,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                style={{
                                    height: '100%',
                                    background: item.color,
                                    borderRadius: 9999,
                                }}
                            />
                        </div>
                    </div>
                );
            })}

            {/* Footer: total consumed */}
            <div
                style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <span style={{ fontSize: '0.8125rem', color: 'var(--ts)' }}>Total consumed</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tp)' }}>
                    {total.toLocaleString()} cr
                </span>
            </div>
        </div>
    );
};
