import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { spring } from '../../config/animations';
import { AnimatedNumber } from './AnimatedNumber';
import { DeltaBadge } from './DeltaBadge';

interface StatCardProps {
    label: string;
    value: number;
    subtitle: string;
    color?: string;
    icon: LucideIcon;
    insight?: string;
    delta?: number | null;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subtitle,
    color = '#0f6cbf',
    icon: Icon,
    insight,
    delta,
}) => (
    <motion.div
        variants={{
            initial: { opacity: 0, y: 24, scale: 0.96 },
            animate: { opacity: 1, y: 0, scale: 1 },
        }}
        whileHover={{ y: -3, boxShadow: `0 8px 28px rgba(0,0,0,0.10), inset 0 -70px 50px -30px ${color}0a` }}
        transition={spring.snappy}
        style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderTop: `3px solid ${color}`,
            borderRadius: 20,
            padding: '20px 22px 18px',
            boxShadow: `var(--shadow), inset 0 -60px 40px -30px ${color}07`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        {/* Subtle ambient gradient wash in the card bottom */}
        <div
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 80,
                background: `linear-gradient(to top, ${color}08 0%, transparent 100%)`,
                pointerEvents: 'none',
                borderRadius: '0 0 20px 20px',
            }}
        />

        {/* Top row: label + icon badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </span>
            <div
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${color}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${color}20`,
                }}
            >
                <Icon size={20} color={color} />
            </div>
        </div>

        {/* Big value + transient delta badge */}
        <div style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: 'var(--tp)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
        }}>
            <AnimatedNumber value={value} />
            {delta !== undefined && <DeltaBadge delta={delta ?? null} size="card" />}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ts)', marginTop: 5 }}>{subtitle}</div>

        {/* Insight pill — blueprint §2.c */}
        {insight && (
            <div style={{ marginTop: 16 }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: `${color}12`,
                        color: color,
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                    }}
                >
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: color, flexShrink: 0, display: 'inline-block' }} />
                    {insight}
                </span>
            </div>
        )}
    </motion.div>
);
