import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
    Alert,
} from '@mui/material';
import { CreditCard, Zap, Gift } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

interface PurchaseCreditsModalProps {
    open: boolean;
    onClose: (purchased?: boolean) => void;
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

export const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ open, onClose }) => {

    const [amount, setAmount] = useState('');
    const [coupon, setCoupon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handlePurchase = async () => {
        const numAmount = parseInt(amount, 10);
        if (!numAmount || numAmount <= 0) {
            setError('Please enter a valid credit amount.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
            const res = await apiFetch(`${baseUrl}/local/lecturebot/api/cms/purchase_credits.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: numAmount,
                    coupon_code: coupon || undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Acquisition initiated! (Payment Gateway Integration Pending)');
                setTimeout(() => {
                    onClose(false);
                }, 2000);
            } else {
                setError(data.message || 'Purchase failed. Please try again.');
            }
        } catch (e) {
            if (e instanceof SessionExpiredError) { return; }
            setError('Network error. Could not complete purchase.');
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return null;
    }

    const isSubmitDisabled = loading || !amount || !!success;

    return (
        <Modal
            open={open}
            onClose={() => {
                onClose();
            }}
            title="Purchase Credits"
            subtitle="Acquire credits for your institutional usage"
            maxWidth={560}
            headerIcon={<CreditCard size={20} color="#0f6cbf" strokeWidth={2} />}
            disableEscapeKeyDown={loading}
            footer={
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        p: 'clamp(16px, 2vh, 24px)',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}>
                            Total Due
                        </Typography>
                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>
                            ₹{amount ? (parseInt(amount, 10) * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            onClick={() => onClose()}
                            variant="outlined"
                            disabled={loading}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#64748b',
                                borderColor: '#cbd5e1',
                                px: 'clamp(16px, 3vw, 24px)',
                                py: 'clamp(8px, 1.5vh, 12px)',
                                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                minWidth: 'clamp(80px, 15vw, 100px)',
                                whiteSpace: 'nowrap',
                                '&:hover:not(:disabled)': {
                                    borderColor: '#94a3b8',
                                    backgroundColor: '#f8fafc',
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePurchase}
                            variant="contained"
                            disabled={isSubmitDisabled}
                            startIcon={loading ? <CircularProgress size="clamp(14px, 1vw, 16px)" sx={{ color: 'white' }} /> : <CreditCard size={18} />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                bgcolor: '#0f6cbf',
                                px: 'clamp(16px, 3vw, 24px)',
                                py: 'clamp(8px, 1.5vh, 12px)',
                                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                minWidth: 'clamp(120px, 25vw, 150px)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                '&:hover:not(:disabled)': {
                                    bgcolor: '#0c5aa8',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                },
                                '&:disabled': {
                                    bgcolor: '#e2e8f0',
                                    color: '#94a3b8',
                                    cursor: 'not-allowed',
                                },
                            }}
                        >
                            {loading ? 'Processing...' : success ? 'Done' : 'Proceed to Pay'}
                        </Button>
                    </Box>
                </Box>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Success state */}
                {success && (
                    <Alert icon={<Zap size={20} />} severity="success" sx={{ borderRadius: 3, fontWeight: 600 }}>
                        {success}
                    </Alert>
                )}

                {/* Error state */}
                {error && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Quick select buttons */}
                <Box>
                    <Typography component="label" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>
                        Quick Select
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                        {QUICK_AMOUNTS.map((qa) => (
                            <Box
                                key={qa}
                                component="button"
                                onClick={() => setAmount(qa.toString())}
                                sx={{
                                    padding: '10px 0',
                                    border: '1.5px solid',
                                    borderColor: amount === qa.toString() ? '#0f6cbf' : '#e2e8f0',
                                    borderRadius: 2,
                                    background: amount === qa.toString() ? '#f0f7ff' : '#fff',
                                    color: amount === qa.toString() ? '#0f6cbf' : 'text.primary',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: '#0f6cbf',
                                        background: '#f8fafc',
                                    }
                                }}
                            >
                                {qa.toLocaleString()}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Custom Amount input */}
                <Box>
                    <Typography component="label" htmlFor="custom-amount" sx={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', mb: 1, letterSpacing: '0.04em'
                    }}>
                        Custom Amount
                    </Typography>
                    <TextField
                        id="custom-amount"
                        type="number"
                        placeholder="Enter credits..."
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        fullWidth
                        variant="outlined"
                        InputProps={{
                            startAdornment: <Zap size={16} color="#64748b" style={{ marginRight: 8 }} />
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                '& fieldset': {
                                    borderColor: '#e2e8f0',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#cbd5e1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#0f6cbf',
                                    borderWidth: '1.5px',
                                },
                            }
                        }}
                    />
                </Box>

                {/* Coupon Input */}
                <Box>
                    <Typography component="label" htmlFor="coupon-code" sx={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', mb: 1, letterSpacing: '0.04em'
                    }}>
                        Discount / Offer Code
                    </Typography>
                    <TextField
                        id="coupon-code"
                        placeholder="Enter promo code (optional)"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                        fullWidth
                        variant="outlined"
                        InputProps={{
                            startAdornment: <Gift size={16} color="#64748b" style={{ marginRight: 8 }} />
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                '& fieldset': {
                                    borderColor: '#e2e8f0',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#cbd5e1',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#0f6cbf',
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
