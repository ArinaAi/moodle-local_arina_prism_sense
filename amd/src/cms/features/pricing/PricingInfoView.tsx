import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@mui/material';
import { Presentation, Video, RefreshCw, Layers, Star, Info } from 'lucide-react';
import { stagger, spring } from '../../config/animations';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

export interface PricingCard {
    id: string;
    title: string;
    subtitle: string;
    accent: string;
    icon: string;
    rows: Array<{ label: string; value: string }>;
    note: string;
    priceUsd?: number;
    totalCredits?: number;
}

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'Presentation': return Presentation;
        case 'Video': return Video;
        case 'RefreshCw': return RefreshCw;
        default: return Layers;
    }
};

// Tier ranking — second card is the recommended one
const POPULAR_INDEX = 1;

// ─── Animated Number Hook ──────────────────────────────────────────────────────
// Smoothly counts from the previous value to the target value over ~400ms
function useAnimatedNumber(target: number, decimals = 2): string {
    const [display, setDisplay] = useState(target);
    const animRef = useRef<number | null>(null);
    const startRef = useRef<number>(target);
    const startTimeRef = useRef<number | null>(null);
    const DURATION = 400;

    useEffect(() => {
        if (animRef.current !== null) { cancelAnimationFrame(animRef.current); }
        const from = startRef.current;
        startTimeRef.current = null;

        const animate = (time: number) => {
            if (startTimeRef.current === null) { startTimeRef.current = time; }
            const elapsed = time - startTimeRef.current;
            const progress = Math.min(elapsed / DURATION, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + (target - from) * eased;
            setDisplay(current);
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                startRef.current = target;
            }
        };
        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current !== null) { cancelAnimationFrame(animRef.current); } };
    }, [target]);

    return display.toFixed(decimals);
}

// ─── Animated Price Cell ───────────────────────────────────────────────────────
const AnimatedPrice: React.FC<{ value: number; symbol: string; locale?: string; decimals?: number }> = ({
    value,
    symbol,
    locale,
    decimals = 2,
}) => {
    const raw = useAnimatedNumber(value, decimals);
    const formatted = parseFloat(raw).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return <>{symbol}{formatted}</>;
};

// ─── Animated Per-Credit Cell ──────────────────────────────────────────────────
const AnimatedPerCredit: React.FC<{ value: number; symbol: string; locale?: string }> = ({ value, symbol, locale }) => {
    const raw = useAnimatedNumber(value, 4);
    const formatted = parseFloat(raw).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });
    return <>{symbol}{formatted}</>;
};


// ─── Currency options ──────────────────────────────────────────────────────────
const CURRENCIES = ['USD', 'INR', 'EUR'] as const;
type Currency = typeof CURRENCIES[number];

const CURRENCY_META: Record<Currency, { symbol: string; locale?: string; }> = {
    USD: { symbol: '$', locale: 'en-US' },
    INR: { symbol: '₹', locale: 'en-IN' },
    EUR: { symbol: '€', locale: 'en-IE' },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const PricingInfoView: React.FC = () => {
    const [packages, setPackages] = useState<PricingCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<Currency>('USD');
    const [rates, setRates] = useState<Record<string, number>>({ USD: 1, INR: 87, EUR: 0.95 });

    const fetchPackages = async () => {
        try {
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const res = await apiFetch(`${baseUrl}/local/arina_prism_sense/api/cms/get_packages.php`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { setPackages(data.data); }
        } catch (e) {
            if (e instanceof SessionExpiredError) { return; }
            console.error('Failed to fetch packages:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRates = async () => {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data && data.rates) {
                setRates({ USD: 1, INR: data.rates.INR, EUR: data.rates.EUR });
            }
        } catch (e) {
            console.error('Failed to fetch live rates, using fallbacks:', e);
        }
    };

    useEffect(() => {
        fetchPackages();
        fetchRates();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={`pricing-skeleton-${i}`} variant="rounded" height={340} style={{ borderRadius: 20 }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Currency Toggle ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

                {/* Segmented control */}
                <div style={{
                    display: 'flex',
                    background: 'var(--paper)',
                    padding: 4,
                    borderRadius: 14,
                    boxShadow: 'var(--shadow)',
                    border: '1px solid var(--border)',
                    position: 'relative',
                }}>
                    {CURRENCIES.map(cur => (
                        <button
                            key={cur}
                            onClick={() => setCurrency(cur)}
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                padding: '8px 22px',
                                border: 'none',
                                background: 'transparent',
                                color: currency === cur ? '#0f6cbf' : 'var(--ts)',
                                fontWeight: currency === cur ? 700 : 500,
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'color 0.2s',
                            }}
                        >
                            {/* Sliding pill */}
                            {currency === cur && (
                                <motion.span
                                    layoutId="currency-pill"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 10,
                                        background: 'rgba(15,108,191,0.10)',
                                        zIndex: -1,
                                        border: '1px solid rgba(15,108,191,0.18)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                                />
                            )}
                            {cur}
                        </button>
                    ))}
                </div>

                {/* Disclaimer for foreign currencies */}
                <div style={{ height: 20 }}>
                    <AnimatePresence>
                        {(currency === 'USD' || currency === 'EUR') && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--ts)', // darker text color for better visibility
                                    fontSize: '0.75rem',
                                    fontWeight: 500, // make it slightly bolder
                                }}
                            >
                                <Info size={14} />
                                <span>Final prices may slightly differ at checkout.</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Pricing Cards ── */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={stagger.cards}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 20,
                    alignItems: 'stretch',
                }}
            >
                {packages.map((card, idx) => {
                    const Icon = getIconComponent(card.icon);
                    const isPopular = idx === POPULAR_INDEX && packages.length > 1;

                    const rate = rates[currency] || 1;
                    const priceValue = (card.priceUsd || 0) * rate;
                    const perCredit = card.totalCredits && card.totalCredits > 0 ? (priceValue / card.totalCredits) : 0;
                    const { symbol, locale } = CURRENCY_META[currency];

                    const staticRows = card.rows;

                    return (
                        <motion.div
                            key={card.title}
                            variants={{
                                initial: { opacity: 0, y: 24, scale: 0.96 },
                                animate: { opacity: 1, y: 0, scale: 1 },
                            }}
                            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                            transition={spring.snappy}
                            layout
                            style={{
                                background: 'var(--paper)',
                                border: isPopular ? '2px solid #0f6cbf' : '1px solid var(--border)',
                                borderRadius: 20,
                                boxShadow: 'var(--shadow)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Popular badge */}
                            {isPopular && (
                                <div style={{
                                    position: 'absolute',
                                    top: 14,
                                    right: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: 'rgba(15,108,191,0.08)',
                                    color: '#0f6cbf',
                                    padding: '3px 10px',
                                    borderRadius: 20,
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}>
                                    <Star size={10} fill="#0f6cbf" />Popular
                                </div>
                            )}

                            {/* Header */}
                            <div style={{
                                padding: '22px 22px 16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 14,
                            }}>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: `${card.accent}14`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon size={20} color={card.accent} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{
                                        fontWeight: 700,
                                        fontSize: '1.0625rem',
                                        color: 'var(--tp)',
                                        margin: 0,
                                        lineHeight: 1.3,
                                    }}>
                                        {card.title}
                                    </h4>
                                    <p style={{
                                        fontSize: '0.8125rem',
                                        color: 'var(--ts)',
                                        marginTop: 3,
                                        marginBottom: 0,
                                        lineHeight: 1.4,
                                    }}>
                                        {card.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* Accent strip */}
                            <div style={{
                                height: 3,
                                background: `linear-gradient(90deg, ${card.accent} 0%, ${card.accent}44 100%)`,
                                marginLeft: 22,
                                marginRight: 22,
                                borderRadius: 2,
                            }} />

                            {/* Static rows */}
                            <div style={{ flex: 1, padding: '8px 22px' }}>
                                {staticRows.map((row) => (
                                    <div
                                        key={row.label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '11px 0',
                                            borderBottom: '1px solid var(--border)',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>{row.label}</span>
                                        <span style={{
                                            fontSize: '0.9375rem',
                                            fontWeight: 700,
                                            color: 'var(--tp)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {row.value}
                                        </span>
                                    </div>
                                ))}

                                {/* Animated Price Row */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '11px 0',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>Price</span>
                                    <span style={{
                                        fontSize: '0.9375rem',
                                        fontWeight: 700,
                                        color: 'var(--tp)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        <AnimatedPrice value={priceValue} symbol={symbol} locale={locale} decimals={2} />
                                    </span>
                                </div>

                                {/* Animated Per-Credit Row */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '11px 0',
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>Per Credit</span>
                                    <span style={{
                                        fontSize: '0.9375rem',
                                        fontWeight: 700,
                                        color: 'var(--tp)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        <AnimatedPerCredit value={perCredit} symbol={symbol} locale={locale} />
                                    </span>
                                </div>
                            </div>

                            {/* Footer note */}
                            <div style={{
                                padding: '12px 22px 16px',
                                borderTop: '1px solid var(--border)',
                            }}>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--td)',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}>
                                    {card.note}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
};
