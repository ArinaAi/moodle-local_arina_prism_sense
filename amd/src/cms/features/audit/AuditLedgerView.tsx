import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, BookOpen } from 'lucide-react';
import { Skeleton } from '@mui/material';
import { stagger, fadeIn } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

export interface LedgerRow {
    id: string;
    ts: string;
    tsRaw: string;
    type: string;
    typeLabel: string;
    meta: string;
    amount: number;
    balance: number;
}

const TYPE_LABELS: Record<string, string> = {
    'All': 'Type: All',
    'PURCHASE': 'Credit Purchase',
    'CONSUMPTION': 'Credit Usage',
    'ALLOCATION_OUT': 'Staff Allocation',
    'ALLOCATION_IN': 'Credits Received',
    'REFUND': 'Refund',
    'ADMIN_ADJUSTMENT': 'Admin Adjustment',
    'MANUAL_ADJUSTMENT': 'Manual Adjustment',
    'EXPIRATION': 'Expired Credits',
};

const TYPE_OPTIONS = Object.keys(TYPE_LABELS);

// ── Shared input style (blueprint §5.6 filter bar) ────────────
const filterInputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    color: 'var(--tp)',
    background: 'var(--paper)',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#0f6cbf';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,108,191,0.12)';
};
const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.boxShadow = 'none';
};

export const AuditLedgerView: React.FC = () => {
    const [typeFilter, setTypeFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [metaSearch, setMetaSearch] = useState('');
    const [ledger, setLedger] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLedger = async () => {
        try {
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const res = await apiFetch(`${baseUrl}/local/arina_prism_sense/api/cms/get_ledger.php`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setLedger(data.data);
            }
        } catch (e) {
            if (e instanceof SessionExpiredError) { return; }
            console.error('Failed to fetch ledger:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []);

    const filtered = useMemo(
        () =>
            ledger.filter((r) => {
                if (typeFilter !== 'All' && r.type !== typeFilter) { return false; }
                if (startDate && r.tsRaw < startDate) { return false; }
                if (endDate && r.tsRaw > endDate) { return false; }
                if (metaSearch && !(r.meta || '').toLowerCase().includes(metaSearch.toLowerCase())) { return false; }
                return true;
            }),
        [typeFilter, startDate, endDate, metaSearch, ledger],
    );

    const handleExportCSV = useCallback(() => {
        if (filtered.length === 0) { return; }
        const headers = ['Timestamp', 'Type', 'Metadata', 'Amount', 'Balance'];
        const rows = filtered.map((r) => [
            r.ts,
            r.typeLabel || r.type,
            `"${(r.meta || '').replace(/"/g, '""')}"`,
            r.amount.toString(),
            r.balance.toString(),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filtered]);

    return (
        <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Filter bar — blueprint §5.6.A: 6 controls */}
            <motion.div
                variants={fadeIn}
                style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow)',
                }}
            >
                {/* Transaction type */}
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                    style={{ ...filterInputStyle, minWidth: 160 }}
                >
                    {TYPE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{TYPE_LABELS[o]}</option>
                    ))}
                </select>

                {/* Date range filter with presets */}
                <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />

                {/* Metadata search — flex-grows to fill remaining space */}
                <input
                    type="text"
                    placeholder="Search metadata (staff names, packages, etc.)…"
                    value={metaSearch}
                    onChange={(e) => setMetaSearch(e.target.value)}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                    style={{ ...filterInputStyle, flex: 1, minWidth: 200 }}
                />

                {/* Export CSV — blueprint §5.6: #0f6cbf weight 600 */}
                <motion.button
                    whileHover={{ color: '#0a5a9d' }}
                    onClick={handleExportCSV}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: filtered.length > 0 ? '#0f6cbf' : 'var(--td)',
                        cursor: filtered.length > 0 ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                        opacity: filtered.length > 0 ? 1 : 0.5,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                    disabled={filtered.length === 0}
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
                {/* maxHeight enables sticky thead (blueprint §5.6.B) */}
                <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
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
                                            // Sticky header
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
                            <AnimatePresence>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={`skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {[20, 14, 35, 14, 14].map((pct, j) => (
                                                <td key={`sk-${i}-${j}`} style={{ padding: '14px 16px', width: `${pct}%` }}>
                                                    <Skeleton animation="wave" height={20} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>
                                            {/* Blueprint §7.1: proper empty state */}
                                            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                                                <BookOpen size={48} style={{ color: 'var(--td)', margin: '0 auto 16px' }} />
                                                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)', marginBottom: 6 }}>
                                                    No transactions found
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>
                                                    {(typeFilter !== 'All' || startDate || endDate || metaSearch)
                                                        ? 'Try adjusting your filters.'
                                                        : 'Credit transactions will appear here once activity begins.'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row) => (
                                        <motion.tr
                                            key={row.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.15 }}
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
                                                <Badge type={row.type} label={row.typeLabel} />
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
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
};
