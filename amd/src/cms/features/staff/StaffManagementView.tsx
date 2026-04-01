import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, Users } from 'lucide-react';
import { Skeleton, Snackbar, Alert } from '@mui/material';
import { stagger, fadeIn } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import { CreditAllocationModal } from '../../components/shared/CreditAllocationModal';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

export interface ApiStaffMember {
    id: number;
    uuid: string | null;
    wallet_id: string | null;
    name: string;
    email: string;
    department: string;
    status: 'active' | 'pending';
    balance: number;
    reserved_credits: number;
    is_admin?: boolean;
}

interface StaffManagementViewProps {
    onViewStaff: (staff: ApiStaffMember) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({ onViewStaff }) => {
    const [search, setSearch] = useState('');
    const [staffList, setStaffList] = useState<ApiStaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modal, setModal] = useState<{ open: boolean; mode: 'distribute' | 'recall'; staff: ApiStaffMember | null }>({
        open: false,
        mode: 'distribute',
        staff: null,
    });
    const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
        open: false,
        message: '',
        type: 'success',
    });

    const fetchStaff = async () => {
        try {
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const response = await apiFetch(`${baseUrl}/local/lecturebot/api/cms/get_staff.php`, {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success && result.data) {
                setStaffList(result.data);
            } else {
                setError(result.message || 'Failed to load staff list');
            }
        } catch (err) {
            if (err instanceof SessionExpiredError) { return; }
            console.error(err);
            setError('Network error: Unable to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const filtered = useMemo(
        () =>
            staffList.filter(
                (s) =>
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.email.toLowerCase().includes(search.toLowerCase()) ||
                    s.department.toLowerCase().includes(search.toLowerCase()),
            ),
        [search, staffList],
    );

    const openModal = (mode: 'distribute' | 'recall', staff: ApiStaffMember) =>
        setModal({ open: true, mode, staff });
    const closeModal = (didUpdate?: boolean) => {
        const modeDesc = modal.mode === 'distribute' ? 'distributed to' : 'recalled from';
        const stName = modal.staff?.name;

        setModal({ open: false, mode: 'distribute', staff: null });
        if (didUpdate) {
            setToast({ open: true, message: `Successfully ${modeDesc} ${stName}`, type: 'success' });
            setLoading(true);
            fetchStaff(); // refresh after allocation
        }
    };

    return (
        <motion.div initial="initial" animate="animate" variants={stagger.cards} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header row */}
            <motion.div variants={fadeIn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--tp)', margin: 0 }}>Staff &amp; Admins</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ts)', marginTop: 4 }}>
                        Manage credit limits and allocations for your professors, researchers, and administrators.
                    </p>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--td)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by ID or Dept…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            padding: '10px 16px 10px 36px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            color: 'var(--tp)',
                            background: 'transparent',
                            outline: 'none',
                            width: 240,
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0f6cbf';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,108,191,0.12)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>
            </motion.div>

            {/* Error Banner */}
            {error && (
                <div style={{ padding: '12px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={18} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{error}</span>
                </div>
            )}

            {/* Table */}
            <motion.div
                variants={fadeIn}
                style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    boxShadow: 'var(--shadow)',
                }}
            >
                <div style={{ maxHeight: '65vh', overflowY: 'auto', borderRadius: 20 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                        <thead>
                            <tr>
                                {[
                                    { label: 'Staff Member', width: '26%' },
                                    { label: 'Department', width: '16%' },
                                    { label: 'Balance', width: '13%' },
                                    { label: 'Reserved', width: '13%' },
                                    { label: 'Status', width: '10%' },
                                    { label: 'Actions', width: '22%' },
                                ].map((h) => (
                                    <th
                                        key={h.label}
                                        style={{
                                            padding: '14px 20px',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            color: 'var(--ts)',
                                            textAlign: 'left',
                                            width: h.width,
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            background: 'var(--paper)',
                                            borderBottom: '2px solid var(--border)',
                                        }}
                                    >
                                        {h.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={`staff-skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {[26, 16, 13, 13, 10, 22].map((pct, j) => (
                                                <td key={`staff-sk-${i}-${j}`} style={{ padding: '16px 20px', width: `${pct}%` }}>
                                                    <Skeleton animation="wave" height={20} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                                                <Users size={48} style={{ color: 'var(--td)', margin: '0 auto 16px' }} />
                                                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)', marginBottom: 6 }}>
                                                    No staff members found
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--ts)' }}>
                                                    {search ? 'Try a different search term.' : 'Staff members will appear here once added.'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((s, idx) => (
                                        <motion.tr
                                            key={s.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'default',
                                                // Alternating rows — subtle stripe
                                                background: idx % 2 === 1 ? 'rgba(15,108,191,0.02)' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(15,108,191,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? 'rgba(15,108,191,0.02)' : 'transparent';
                                            }}
                                        >
                                            {/* Staff member — avatar + name + email */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 10,
                                                        background: 'linear-gradient(135deg, #0f6cbf 0%, #3d8fd1 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        letterSpacing: '-0.02em',
                                                    }}>
                                                        {(s.name || 'U').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.3 }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--tp)' }}>{s.name}</span>
                                                            {s.is_admin && (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '1px 7px',
                                                                    borderRadius: 5,
                                                                    background: 'rgba(111,66,193,0.10)',
                                                                    color: '#6f42c1',
                                                                    fontSize: '0.6875rem',
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.04em',
                                                                    textTransform: 'uppercase',
                                                                }}>Admin</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--ts)', marginTop: 1 }}>{s.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Department */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '3px 10px',
                                                    borderRadius: 6,
                                                    background: 'rgba(15,108,191,0.06)',
                                                    color: 'var(--tp)',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 500,
                                                }}>
                                                    {s.department}
                                                </span>
                                            </td>
                                            {/* Balance */}
                                            <td style={{
                                                padding: '16px 20px',
                                                fontSize: '0.9375rem',
                                                fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums',
                                                color: '#0f6cbf',
                                            }}>
                                                {s.balance.toLocaleString()}
                                            </td>
                                            {/* Reserved Credits */}
                                            <td style={{ padding: '16px 20px' }}>
                                                {s.reserved_credits > 0 ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '3px 10px',
                                                        borderRadius: 6,
                                                        background: 'rgba(217, 119, 6, 0.10)',
                                                        color: '#b45309',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}>
                                                        {s.reserved_credits.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--td)' }}>—</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <Badge type={s.status === 'active' ? 'Active' : 'Ready'} />
                                            </td>
                                            {/* Actions */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ActionLink label="History" onClick={() => onViewStaff(s)} />
                                                    <ActionDot />
                                                    <ActionLink label="Distribute" onClick={() => openModal('distribute', s)} />
                                                    {s.status === 'active' && (
                                                        <>
                                                            <ActionDot />
                                                            <ActionLink label="Recall" onClick={() => openModal('recall', s)} />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div> {/* end scrollable wrapper */}
            </motion.div>

            {/* Modal */}
            {modal.staff && (
                <CreditAllocationModal
                    isOpen={modal.open}
                    onClose={closeModal}
                    mode={modal.mode}
                    staffName={modal.staff.name}
                    staffId={modal.staff.id}
                    currentBalance={modal.staff.balance}
                />
            )}

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.type} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </motion.div>
    );
};

// ── Action link — blueprint §5.2: always #0f6cbf weight 600, hover underline ──
const ActionLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <motion.button
        whileHover={{ textDecoration: 'underline', color: '#0a5a9d' }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#0f6cbf',
            cursor: 'pointer',
            padding: '2px 0',
            fontFamily: 'inherit',
            textDecoration: 'none',
        }}
    >
        {label}
    </motion.button>
);

// Dot separator between action links (blueprint §5.2)
const ActionDot: React.FC = () => (
    <span style={{ color: 'var(--td)', fontSize: '0.75rem', userSelect: 'none' }}>·</span>
);
