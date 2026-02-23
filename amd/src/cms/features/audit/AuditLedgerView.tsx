import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { stagger, fadeIn } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import { MOCK_LEDGER } from '../../config/mockData';

const TYPE_OPTIONS = ['All', 'CONSUMPTION', 'ALLOCATION', 'PURCHASE', 'RESERVATION'];
const USER_OPTIONS = ['All', 'Prof. Sarah Smith', 'Dr. Ian Malcolm', 'Nurse Joy', 'Prof. Albus D.', 'Dr. John Watson'];

export const AuditLedgerView: React.FC = () => {
    const [typeFilter, setTypeFilter] = useState('All');
    const [userFilter, setUserFilter] = useState('All');

    const filtered = useMemo(
        () =>
            MOCK_LEDGER.filter((r) => {
                if (typeFilter !== 'All' && r.type !== typeFilter) { return false; }
                if (userFilter !== 'All' && !r.meta.includes(userFilter)) { return false; }
                return true;
            }),
        [typeFilter, userFilter],
    );

    const selectStyle: React.CSSProperties = {
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        fontSize: '0.8125rem',
        fontFamily: 'inherit',
        color: 'var(--tp)',
        background: 'var(--paper)',
        outline: 'none',
        cursor: 'pointer',
    };

    return (
        <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Filter bar */}
            <motion.div variants={fadeIn} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
                    {TYPE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o === 'All' ? 'Type: All' : o}</option>
                    ))}
                </select>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={selectStyle}>
                    {USER_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o === 'All' ? 'User: All' : o}</option>
                    ))}
                </select>
                <div style={{ flex: 1 }} />
                <motion.button
                    whileHover={{ color: '#0f6cbf' }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--ts)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    <Download size={14} />Export CSV
                </motion.button>
            </motion.div>

            {/* Table */}
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
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {filtered.map((row, i) => (
                                <motion.tr
                                    key={`${row.ts}-${i}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15, delay: i * 0.03 }}
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'var(--rh)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--ts)' }}>{row.ts}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <Badge type={row.type} />
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>{row.meta}</td>
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
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </motion.div>
        </motion.div>
    );
};
