import React, { useState, useEffect } from 'react';
import { Skeleton } from '@mui/material';
import { Presentation, Video, RefreshCw, Layers, Star, Info } from 'lucide-react';
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

// ─── Static price formatters ───────────────────────────────────────────────────
const formatPrice = (value: number, symbol: string, locale: string | undefined, decimals: number): string => {
    return symbol + value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatPerCredit = (value: number, symbol: string, locale: string | undefined): string => {
    return symbol + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
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
    const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
    const [ratesLoaded, setRatesLoaded] = useState(false);

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
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const res = await apiFetch(`${baseUrl}/local/arina_prism_sense/api/cms/get_exchange_rates.php`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success && data.data) {
                setRates(data.data);
                setRatesLoaded(true);
            }
        } catch (e) {
            if (e instanceof SessionExpiredError) { return; }
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
                    {CURRENCIES.map(cur => {
                        const disabled = cur !== 'USD' && !ratesLoaded;
                        return (
                        <button
                            key={cur}
                            onClick={() => !disabled && setCurrency(cur)}
                            disabled={disabled}
                            title={disabled ? 'Live rates unavailable' : undefined}
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                padding: '8px 22px',
                                border: 'none',
                                background: currency === cur ? 'rgba(15,108,191,0.10)' : 'transparent',
                                color: disabled ? 'var(--td)' : currency === cur ? '#0f6cbf' : 'var(--ts)',
                                fontWeight: currency === cur ? 700 : 500,
                                borderRadius: 10,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                outline: currency === cur ? '1px solid rgba(15,108,191,0.18)' : 'none',
                                transition: 'background 0.15s, color 0.15s',
                                opacity: disabled ? 0.45 : 1,
                            }}
                        >
                            {cur}
                        </button>
                        );
                    })}
                </div>

                {/* Disclaimer for foreign currencies */}
                <div style={{ height: 20 }}>
                    {(currency === 'USD' || currency === 'EUR') && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: 'var(--ts)',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                            }}
                        >
                            <Info size={14} />
                            <span>Final prices may slightly differ at checkout.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pricing Cards ── */}
            <div
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
                        <div
                            key={card.title}
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
                                        {formatPrice(priceValue, symbol, locale, 2)}
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
                                        {formatPerCredit(perCredit, symbol, locale)}
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
