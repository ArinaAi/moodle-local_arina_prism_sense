import React, { useState } from 'react';
import { emitBalanceRefresh } from '../../lib/balanceEvents';
import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
} from '@mui/material';
import { Send, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

interface CreditAllocationModalProps {
    isOpen: boolean;
    onClose: (didUpdate?: boolean) => void;
    mode: 'distribute' | 'recall';
    staffName: string;
    staffId: number;
    currentBalance?: number;
}

export const CreditAllocationModal: React.FC<CreditAllocationModalProps> = ({
    isOpen,
    onClose,
    mode,
    staffName,
    staffId,
    currentBalance,
}) => {

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isRecall = mode === 'recall';
    const title = isRecall ? 'Recall Credits' : 'Distribute Credits';
    const accentColor = isRecall ? '#dc3545' : '#0f6cbf';

    const handleSubmit = async () => {
        const val = Number(amount);
        if (Number.isNaN(val) || val <= 0 || !Number.isInteger(val)) {
            setError('Please enter a valid whole number greater than 0');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const response = await apiFetch(`${baseUrl}/local/lecturebot/api/cms/allocate_credits.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_user_id: staffId,
                    amount: val,
                    action: mode
                })
            });
            const result = await response.json();
            if (result.success) {
                emitBalanceRefresh();
                onClose(true);
            } else {
                setError(result.message || 'Allocation failed');
            }
        } catch (err) {
            if (err instanceof SessionExpiredError) { return; }
            console.error(err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={() => onClose()}
            title={title}
            headerIcon={isRecall
                ? <ArrowDownLeft size={18} color="#dc3545" strokeWidth={2.5} />
                : <ArrowUpRight size={18} color="#0f6cbf" strokeWidth={2.5} />
            }
            headerIconBgColor={isRecall ? 'rgba(220, 53, 69, 0.08)' : 'rgba(15, 108, 191, 0.08)'}
            footer={
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 'clamp(16px, 2vh, 24px)',
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--paper)',
                        flexShrink: 0,
                    }}
                >
                    <Button
                        onClick={() => onClose()}
                        variant="outlined"
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: 'var(--ts)',
                            borderColor: 'var(--border)',
                            borderRadius: '10px',
                            px: 3,
                            py: 1,
                            fontSize: '0.875rem',
                            '&:hover:not(:disabled)': {
                                borderColor: 'var(--ts)',
                                backgroundColor: 'var(--rh)',
                            },
                            '&:disabled': {
                                opacity: 0.5,
                            },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        startIcon={loading
                            ? <CircularProgress size={16} sx={{ color: 'white' }} />
                            : <Send size={15} />
                        }
                        disabled={loading || !amount}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: accentColor,
                            borderRadius: '10px',
                            px: 3,
                            py: 1,
                            fontSize: '0.875rem',
                            boxShadow: 'none',
                            '&:hover:not(:disabled)': {
                                bgcolor: isRecall ? '#c82333' : '#0c5aa8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            },
                            '&:disabled': {
                                bgcolor: 'var(--border)',
                                color: 'var(--td)',
                            },
                        }}
                    >
                        {loading ? 'Processing...' : (isRecall ? 'Confirm Recall' : 'Confirm Allocation')}
                    </Button>
                </Box>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Staff info — clean card, no bulky left border */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    bgcolor: 'var(--rh)',
                }}>
                    <Box sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${accentColor}, ${isRecall ? '#e86c77' : '#3d8fd1'})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                    }}>
                        {(staffName || 'U').slice(0, 2).toUpperCase()}
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--ts)', lineHeight: 1.3 }}>
                            {isRecall ? 'Recall from' : 'Distribute to'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)', lineHeight: 1.3 }}>
                            {staffName}
                            {currentBalance !== undefined && (
                                <Typography component="span" sx={{ fontWeight: 400, color: 'var(--ts)', ml: 0.5, fontSize: '0.8125rem' }}>
                                    · {currentBalance.toLocaleString()} cr
                                </Typography>
                            )}
                        </Typography>
                    </Box>
                </Box>

                {error && (
                    <Typography sx={{ color: '#dc3545', fontSize: '0.8125rem', fontWeight: 500 }}>
                        {error}
                    </Typography>
                )}

                {/* Amount input — clean, matches PurchaseCreditsModal */}
                <Box>
                    <Typography component="label" htmlFor="credit-amount" sx={{
                        display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                        color: 'var(--ts)', mb: 1, letterSpacing: '0.06em',
                    }}>
                        Amount
                    </Typography>
                    <TextField
                        id="credit-amount"
                        type="number"
                        placeholder="Enter credit amount…"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                            if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                            }
                        }}
                        fullWidth
                        variant="outlined"
                        autoFocus
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                fontSize: '0.9375rem',
                                backgroundColor: 'var(--paper)',
                                '& fieldset': {
                                    borderColor: 'var(--border)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'var(--ts)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: accentColor,
                                    borderWidth: '1.5px',
                                },
                            }
                        }}
                    />
                </Box>
            </Box>
        </Modal>
    );
};
