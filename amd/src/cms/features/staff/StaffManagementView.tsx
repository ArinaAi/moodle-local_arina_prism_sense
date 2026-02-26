import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle } from 'lucide-react';
import { Skeleton, Snackbar, Alert } from '@mui/material';
import { stagger, fadeIn } from '../../config/animations';
import { Badge } from '../../components/ui/Badge';
import { CreditAllocationModal } from '../../components/shared/CreditAllocationModal';

export interface ApiStaffMember {
    id: number;
    uuid: string | null;
    wallet_id: string | null;
    name: string;
    email: string;
    department: string;
    status: 'active' | 'pending';
    balance: number;
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
            const baseUrl = (window as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
            const response = await fetch(`${baseUrl}/local/lecturebot/api/cms/get_staff.php`, {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success && result.data) {
                setStaffList(result.data);
            } else {
                setError(result.message || 'Failed to load staff list');
            }
        } catch (err) {
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
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--tp)', margin: 0 }}>Active Teaching Staff</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ts)', marginTop: 4 }}>
                        Manage credit limits and allocations for your professors and researchers.
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
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                }}
            >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                    <thead>
                        <tr
                            style={{
                                borderBottom: '1px solid var(--border)',
                            }}
                        >
                            {['Sub-User Name / ID', 'Department', 'Balance', 'Status', 'Actions'].map((h) => (
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
                                        background: 'transparent',
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
                                    <tr key={`skeleton-${i}`}>
                                        <td colSpan={5} style={{ padding: '14px 16px' }}>
                                            <Skeleton animation="wave" height={24} />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ts)' }}>
                                        No active teaching staff found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s) => (
                                    <motion.tr
                                        key={s.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--rh)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                    >
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--tp)' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--ts)', marginTop: 2 }}>{s.email}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: '0.9375rem', color: 'var(--tp)' }}>
                                            {s.department}
                                        </td>
                                        <td
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: '0.9375rem',
                                                fontWeight: 600,
                                                fontVariantNumeric: 'tabular-nums',
                                                color: 'var(--tp)',
                                            }}
                                        >
                                            {s.balance.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <Badge type={s.status === 'active' ? 'Active' : 'Ready'} />
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <ActionLink label="History" onClick={() => onViewStaff(s)} />
                                                <ActionLink label="Distribute" onClick={() => openModal('distribute', s)} />
                                                {s.status === 'active' && <ActionLink label="Recall" onClick={() => openModal('recall', s)} />}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
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

// ── Action link ──────────────────────────────────────────────
const ActionLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <motion.button
        whileHover={{ color: '#0f6cbf' }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--ts)',
            cursor: 'pointer',
            padding: '2px 4px',
            fontFamily: 'inherit',
        }}
    >
        {label}
    </motion.button>
);
