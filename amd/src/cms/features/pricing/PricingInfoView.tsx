import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@mui/material';
import { Presentation, Video, RefreshCw, Layers } from 'lucide-react';
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

export const PricingInfoView: React.FC = () => {
    const [packages, setPackages] = useState<PricingCard[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPackages = async () => {
        try {
            const baseUrl = (window as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={250} style={{ borderRadius: 20 }} />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={stagger.cards}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'stretch' }}
        >
            {packages.map((card) => {
                const Icon = getIconComponent(card.icon);
                return (
                    <motion.div
                        key={card.title}
                        variants={{
                            initial: { opacity: 0, y: 20, scale: 0.97 },
                            animate: { opacity: 1, y: 0, scale: 1 },
                        }}
                        whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                        transition={spring.snappy}
                        style={{
                            background: 'var(--paper)',
                            border: '1px solid var(--border)',
                            borderTop: `3px solid ${card.accent}`,
                            borderRadius: 20,
                            padding: '20px 24px',
                            boxShadow: 'var(--shadow)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                                <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--tp)', margin: 0 }}>{card.title}</h4>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--ts)', marginTop: 3 }}>{card.subtitle}</p>
                            </div>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: `${card.accent}14`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Icon size={18} color={card.accent} />
                            </div>
                        </div>

                        {/* Line items */}
                        <div style={{ flex: 1 }}>
                            {card.rows.map((row) => (
                                <div
                                    key={row.label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '10px 0',
                                        borderBottom: '1px solid var(--border)',
                                    }}
                                >
                                    <span style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>{row.label}</span>
                                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)' }}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Note */}
                        <p style={{ fontSize: '0.75rem', color: 'var(--td)', marginTop: 14, lineHeight: 1.5, margin: '14px 0 0' }}>
                            {card.note}
                        </p>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};
