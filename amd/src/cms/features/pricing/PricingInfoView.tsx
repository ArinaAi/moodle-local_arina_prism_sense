import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@mui/material';
import { Presentation, Video, RefreshCw, Layers, Star } from 'lucide-react';
import { stagger, spring } from '../../config/animations';

export interface PricingCard {
    id: string;
    title: string;
    subtitle: string;
    accent: string;
    icon: string;
    rows: Array<{ label: string; value: string }>;
    note: string;
}

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'Presentation': return Presentation;
        case 'Video': return Video;
        case 'RefreshCw': return RefreshCw;
        default: return Layers;
    }
};

// Tier ranking — first card gets a "Popular" badge if > 1 card
const POPULAR_INDEX = 1; // second card is typically the recommended one

export const PricingInfoView: React.FC = () => {
    const [packages, setPackages] = useState<PricingCard[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPackages = async () => {
        try {
            const baseUrl = (globalThis as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
            const res = await fetch(`${baseUrl}/local/lecturebot/api/cms/get_packages.php`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setPackages(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch packages:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
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

                return (
                    <motion.div
                        key={card.title}
                        variants={{
                            initial: { opacity: 0, y: 24, scale: 0.96 },
                            animate: { opacity: 1, y: 0, scale: 1 },
                        }}
                        whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                        transition={spring.snappy}
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

                        {/* Header — muted: icon badge + title, using accent as tint only */}
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

                        {/* Accent strip — just a thin 3px divider line in accent colour */}
                        <div style={{
                            height: 3,
                            background: `linear-gradient(90deg, ${card.accent} 0%, ${card.accent}44 100%)`,
                            marginLeft: 22,
                            marginRight: 22,
                            borderRadius: 2,
                        }} />

                        {/* Row items */}
                        <div style={{ flex: 1, padding: '8px 22px' }}>
                            {card.rows.map((row, i) => (
                                <div
                                    key={row.label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '11px 0',
                                        borderBottom: i < card.rows.length - 1 ? '1px solid var(--border)' : 'none',
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
    );
};
