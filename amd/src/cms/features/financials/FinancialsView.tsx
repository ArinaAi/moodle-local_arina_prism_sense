import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { stagger, fadeIn, spring } from '../../config/animations';
import { MOCK_ACQUISITIONS } from '../../config/mockData';

export const FinancialsView: React.FC = () => {
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 20, alignItems: 'flex-start' }}>
            {/* Left — Acquisition History */}
            <motion.div
                variants={fadeIn}
                style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span
                        style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: '#0f6cbf',
                        }}
                    >
                        Acquisition History
                    </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Date', 'Credits', 'Paid', 'Unit Cost'].map((h) => (
                                <th
                                    key={h}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: 'var(--ts)',
                                        textAlign: 'left',
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_ACQUISITIONS.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ts)' }}>{row.date}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)' }}>{row.credits}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>{row.paid}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0f6cbf', fontWeight: 500 }}>{row.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>

            {/* Right — Coupon Center */}
            <motion.div variants={fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#0f6cbf',
                    }}
                >
                    Coupon Center
                </div>

                {/* Highlighted coupon */}
                <CouponCard
                    code="NY2026_COLLEGE_OFFER"
                    desc="20% off on all credit top-ups"
                    highlighted
                    copied={copied === 'NY2026_COLLEGE_OFFER'}
                    onCopy={handleCopy}
                />

                {/* Regular coupon */}
                <CouponCard
                    code="BIO_RESEARCH_250"
                    desc="Bonus credits for Biology Dept."
                    copied={copied === 'BIO_RESEARCH_250'}
                    onCopy={handleCopy}
                />
            </motion.div>
        </motion.div>
    );
};

// ── Coupon Card ──────────────────────────────────────────────
const CouponCard: React.FC<{
    code: string;
    desc: string;
    highlighted?: boolean;
    copied: boolean;
    onCopy: (code: string) => void;
}> = ({ code, desc, highlighted, copied, onCopy }) => (
    <motion.div
        whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }}
        transition={spring.snappy}
        style={{
            background: highlighted ? '#0f6cbf' : 'var(--paper)',
            border: highlighted ? 'none' : '1px solid var(--border)',
            borderRadius: 14,
            padding: '14px 18px',
            boxShadow: 'var(--shadow)',
            color: highlighted ? '#fff' : 'var(--tp)',
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.03em', fontFamily: 'monospace' }}>
                {code}
            </span>
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onCopy(code)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: highlighted ? 'rgba(255,255,255,0.8)' : 'var(--ts)',
                    display: 'flex',
                    padding: 4,
                }}
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </motion.button>
        </div>
        <p style={{ fontSize: '0.8125rem', opacity: 0.85, margin: 0 }}>{desc}</p>
    </motion.div>
);
