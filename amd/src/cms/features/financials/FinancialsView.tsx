import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Skeleton } from '@mui/material';
import { stagger, fadeIn, spring } from '../../config/animations';

export interface AcquisitionRow {
    id: string;
    date: string;
    credits: string;
    paid: string;
    unit: string;
    status: string;
}

interface CouponData {
    id: string;
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    is_active: boolean;
    usage_limit: number | null;
    times_used: number;
}

export const FinancialsView: React.FC = () => {
    const [copied, setCopied] = useState<string | null>(null);
    const [acquisitions, setAcquisitions] = useState<AcquisitionRow[]>([]);
    const [coupons, setCoupons] = useState<CouponData[]>([]);
    const [loading, setLoading] = useState(true);
    const [couponsLoading, setCouponsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const baseUrl = (globalThis as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
            const [acqRes, couponRes] = await Promise.all([
                fetch(`${baseUrl}/local/lecturebot/api/cms/get_acquisitions.php`, { credentials: 'include' }),
                fetch(`${baseUrl}/local/lecturebot/api/cms/get_coupons.php`, { credentials: 'include' })
            ]);

            const acqData = await acqRes.json();
            if (acqData.success) {
                setAcquisitions(acqData.data);
            }

            const couponData = await couponRes.json();
            if (couponData.success) {
                setCoupons(couponData.data.filter((c: CouponData) => c.is_active));
            }
        } catch (e) {
            console.error('Failed to fetch financials data:', e);
        } finally {
            setLoading(false);
            setCouponsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatDiscount = (coupon: CouponData): string => {
        if (coupon.discount_type === 'PERCENTAGE') {
            return `${coupon.discount_value}% off on credit purchases`;
        }
        return `₹${coupon.discount_value} off on credit purchases`;
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
                    // No overflow:hidden — was causing white corner clipping on rounded card
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
                            {['Date', 'Credits', 'Paid', 'Unit Cost', 'Status'].map((h) => (
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
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={`financials-skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                    {Array.from({ length: 5 }).map((__un, j) => (
                                        <td key={`financials-sk-${i}-${j}`} style={{ padding: '14px 16px' }}>
                                            <Skeleton animation="wave" height={24} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : acquisitions.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--ts)' }}>
                                    No acquisitions found.
                                </td>
                            </tr>
                        ) : (
                            acquisitions.map((row, i) => (
                                <tr key={row.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ts)' }}>{row.date}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)' }}>{row.credits}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>{row.paid}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#0f6cbf', fontWeight: 500 }}>{row.unit}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '3px 10px',
                                            borderRadius: 12,
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.03em',
                                            ...(row.status === 'COMPLETED' ? {
                                                background: 'rgba(34,197,94,0.1)',
                                                color: '#16a34a',
                                            } : row.status === 'FAILED' ? {
                                                background: 'rgba(239,68,68,0.1)',
                                                color: '#dc2626',
                                            } : {
                                                background: 'rgba(245,158,11,0.1)',
                                                color: '#d97706',
                                            }),
                                        }}>
                                            {row.status?.replace('_', ' ') || 'PENDING'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
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

                {couponsLoading ? (
                    <>
                        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '14px' }} animation="wave" />
                        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '14px' }} animation="wave" />
                    </>
                ) : coupons.length === 0 ? (
                    <div style={{
                        padding: '24px 18px',
                        background: 'var(--paper)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        textAlign: 'center',
                        color: 'var(--ts)',
                        fontSize: '0.875rem'
                    }}>
                        No active coupons available.
                    </div>
                ) : (
                    coupons.map((coupon, i) => (
                        <CouponCard
                            key={coupon.id}
                            code={coupon.code}
                            desc={coupon.description || formatDiscount(coupon)}
                            highlighted={i === 0}
                            copied={copied === coupon.code}
                            onCopy={handleCopy}
                        />
                    ))
                )}
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
