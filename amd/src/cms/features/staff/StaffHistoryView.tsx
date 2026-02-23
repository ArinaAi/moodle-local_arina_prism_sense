import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { stagger, fadeIn, spring } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import { MOCK_STAFF_HISTORY, type StaffMember } from '../../config/mockData';

interface StaffHistoryViewProps {
    staff: StaffMember;
    onBack: () => void;
}

export const StaffHistoryView: React.FC<StaffHistoryViewProps> = ({ staff, onBack }) => (
    <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Back */}
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

        {/* 3 info cards */}
        <motion.div variants={fadeIn} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <InfoCard label="Current Balance" value={staff.balance.toLocaleString()} accent="#0f6cbf" />
            <InfoCard label="Department" value={staff.dept} accent="#28a745" />
            <InfoCard label="External ID" value={staff.id} accent="#6f42c1" />
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Timestamp', 'Type', 'Description', 'Amount', 'Balance'].map((h) => (
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
                    {MOCK_STAFF_HISTORY.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ts)' }}>{row.ts}</td>
                            <td style={{ padding: '14px 16px' }}>
                                <Badge type={row.type} />
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>{row.desc}</td>
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
                    ))}
                </tbody>
            </table>
        </motion.div>
    </motion.div>
);

// ── Info Card ────────────────────────────────────────────────
const InfoCard: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
    <div
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
    </div>
);
