import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { tween } from '../../config/animations';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { NAV_TITLES } from '../../config/mockData';

interface AppHeaderProps {
    activeNav: string;
    balance: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeNav, balance }) => (
    <div
        style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--paper)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            boxShadow: '0 1px 0 rgba(255,255,255,0.5), var(--shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}
    >
        {/* Left — Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #0f6cbf, #3d8fd1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Zap size={16} color="#fff" />
            </div>
            <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--tp)', lineHeight: 1.2 }}>
                    PRISM Credit
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ts)', lineHeight: 1.2 }}>
                    Dashboard
                </div>
            </div>
        </div>

        {/* Center — animated page title */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={activeNav}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={tween.fast}
                    style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--tp)',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {NAV_TITLES[activeNav] || activeNav}
                </motion.span>
            </AnimatePresence>
        </div>

        {/* Right — balance + button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
                <div
                    style={{
                        fontSize: '0.6875rem',
                        textTransform: 'uppercase',
                        color: 'var(--ts)',
                        letterSpacing: '0.04em',
                        fontWeight: 600,
                    }}
                >
                    Institutional Balance
                </div>
                <div
                    style={{
                        fontSize: '1.0625rem',
                        fontWeight: 700,
                        color: 'var(--tp)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    <AnimatedNumber value={balance} /> Credits
                </div>
            </div>
            <motion.button
                whileHover={{ backgroundColor: '#0a5a9d', y: -1, boxShadow: '0 4px 12px rgba(15,108,191,0.25)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: 20,
                    background: '#0f6cbf',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                }}
            >
                + Add Credits
            </motion.button>
        </div>
    </div>
);
