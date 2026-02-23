import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { spring } from '../../config/animations';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
    label: string;
    value: number;
    subtitle: string;
    color?: string;
    icon: LucideIcon;
    insight?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subtitle,
    color = '#0f6cbf',
    icon: Icon,
    insight,
}) => (
    <motion.div
        variants={{
            initial: { opacity: 0, y: 20, scale: 0.97 },
            animate: { opacity: 1, y: 0, scale: 1 },
        }}
        whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}
        transition={spring.snappy}
        style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderTop: `3px solid ${color}`,
            borderRadius: 20,
            padding: '18px 20px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        {/* Top row: label + icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ts)' }}>{label}</span>
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Icon size={18} color={color} />
            </div>
        </div>

        {/* Value */}
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--tp)', letterSpacing: '-0.02em' }}>
            <AnimatedNumber value={value} />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ts)', marginTop: 3 }}>{subtitle}</div>

        {/* Insight footer */}
        {insight && (
            <div
                style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <div
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: 9999,
                        background: color,
                        flexShrink: 0,
                    }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--ts)' }}>{insight}</span>
            </div>
        )}
    </motion.div>
);
