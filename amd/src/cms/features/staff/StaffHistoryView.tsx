import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Skeleton } from '@mui/material';
import { stagger, fadeIn, spring } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import type { ApiStaffMember } from './StaffManagementView';

interface StaffHistoryViewProps {
    staff: ApiStaffMember;
    onBack: () => void;
}

interface HistoryRow {
    id: string;
    ts: string;
    type: string;
    typeLabel?: string;
    desc?: string;
    meta?: string;
    amount: number;
    balance: number;
}

export const StaffHistoryView: React.FC<StaffHistoryViewProps> = ({ staff, onBack }) => {
    const [history, setHistory] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const baseUrl = (globalThis as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
        fetch(`${baseUrl}/local/lecturebot/api/cms/get_ledger.php?sub_user_id=${staff.id}`, {
            credentials: 'include',
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.success) {
                    setHistory(data.data || []);
                }
            })
            .catch((e) => console.error('Failed to load history:', e))
            .finally(() => setLoading(false));
    }, [staff.id]);

    return (
        <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Back — blueprint §5.3 + §6.15 */}
            <motion.div variants={fadeIn}>
                <motion.button
                    onClick={onBack}
                    whileHover={{ x: -3, color: '#0f6cbf' }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring.snappy}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ts)',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        padding: 0,
                    }}
                >
                    <ArrowLeft size={18} />
                    {staff.name}
                </motion.button>
            </motion.div>

            {/* 4 info cards — blueprint §5.3.B */}
            <motion.div variants={fadeIn} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <InfoCard label="Current Balance" value={staff.balance.toLocaleString()} accent="#0f6cbf" />
                <InfoCard
                    label="Reserved Credits"
                    value={staff.reserved_credits > 0 ? `🔒 ${staff.reserved_credits.toLocaleString()}` : '—'}
                    accent="#d97706"
                />
                <InfoCard label="Department" value={staff.department} accent="#28a745" />
                <InfoCard label="Email" value={staff.email} accent="#6f42c1" />
            </motion.div>

            {/* History table */}
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
                {/* Section label */}
                <div
                    style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#0f6cbf',
                    }}
                >
                    Consumption &amp; Allocation History
                </div>

                {/* Sticky scrollable table */}
                <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Timestamp', 'Type', 'Metadata', 'Amount', 'Balance'].map((h) => (
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
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            background: 'var(--paper)',
                                            boxShadow: 'inset 0 -1px 0 var(--border)',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {[20, 14, 35, 14, 14].map((pct, j) => (
                                            <td key={`sk-${i}-${j}`} style={{ padding: '14px 16px', width: `${pct}%` }}>
                                                <Skeleton animation="wave" height={20} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        {/* Blueprint §7.1 empty state */}
                                        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                                            <BookOpen size={48} style={{ color: 'var(--td)', margin: '0 auto 16px' }} />
                                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)', marginBottom: 6 }}>
                                                No history yet
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>
                                                Credit activity for {staff.name} will appear here.
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((row) => (
                                    <tr
                                        key={row.id}
                                        style={{ borderBottom: '1px solid var(--border)' }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--rh)'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ts)' }}>{row.ts}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <Badge type={row.type} label={row.typeLabel} />
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>
                                            {row.meta || row.desc || '—'}
                                        </td>
                                        <td
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: '0.9375rem',
                                                fontWeight: 600,
                                                fontVariantNumeric: 'tabular-nums',
                                                color: row.amount < 0 ? '#dc3545' : '#28a745',
                                            }}
                                        >
                                            {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()}
                                        </td>
                                        <td
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: '0.9375rem',
                                                fontVariantNumeric: 'tabular-nums',
                                                color: 'var(--tp)',
                                            }}
                                        >
                                            {row.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Info Card — blueprint §5.3.B ─────────────────────────────
const InfoCard: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
    <motion.div
        whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${accent}`,
            borderRadius: 12,
            padding: '14px 18px',
            boxShadow: 'var(--shadow)',
        }}
    >
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ts)', letterSpacing: '0.04em', marginBottom: 4 }}>
            {label}
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--tp)' }}>{value}</div>
    </motion.div>
);
