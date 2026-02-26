import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
} from '@mui/material';
import { Send, Undo } from '@mui/icons-material';
import { Modal } from '../ui/Modal';

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

    const handleSubmit = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const baseUrl = (window as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
            const response = await fetch(`${baseUrl}/local/lecturebot/api/cms/allocate_credits.php`, {
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
                onClose(true); // Tell parent to refresh
            } else {
                setError(result.message || 'Allocation failed');
            }
        } catch (err) {
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
            headerIcon={isRecall ? <Undo sx={{ color: '#dc3545' }} fontSize="small" /> : <Send sx={{ color: '#0f6cbf' }} fontSize="small" />}
            headerIconBgColor={isRecall ? 'rgba(220, 53, 69, 0.1)' : 'rgba(15, 108, 191, 0.1)'}
            footer={
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 2,
                        p: 'clamp(16px, 2vh, 24px)',
                        borderTop: '1px solid #f1f5f9',
                        backgroundColor: '#ffffff',
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
                        onClick={handleSubmit}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size="clamp(14px, 1vw, 16px)" sx={{ color: 'white' }} /> : <Send fontSize="small" />}
                        disabled={loading || !amount}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: isRecall ? '#dc3545' : '#0f6cbf',
                            px: 'clamp(16px, 3vw, 24px)',
                            py: 'clamp(8px, 1.5vh, 12px)',
                            fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                            minWidth: 'clamp(120px, 25vw, 150px)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease',
                            '&:hover:not(:disabled)': {
                                bgcolor: isRecall ? '#c82333' : '#0c5aa8',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                transform: 'translateY(-2px)',
                            },
                            '&:disabled': {
                                bgcolor: '#e2e8f0',
                                color: '#94a3b8',
                                cursor: 'not-allowed',
                                transform: 'none',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {loading ? 'Processing...' : (isRecall ? 'Confirm Recall' : 'Confirm Allocation')}
                    </Button>
                </Box>
            }
        >
            {/* Staff info */}
            <Box sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isRecall ? 'rgba(220,53,69,0.06)' : 'rgba(15,108,191,0.06)',
                borderLeft: `3px solid ${isRecall ? '#dc3545' : '#0f6cbf'} `,
            }}>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {isRecall ? 'Recall from' : 'Distribute to'}
                </Typography>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {staffName}
                    {currentBalance !== undefined && (
                        <Typography component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                            (Balance: {currentBalance.toLocaleString()} cr)
                        </Typography>
                    )}
                </Typography>
            </Box>

            {error && (
                <Typography sx={{ color: '#dc3545', fontSize: '0.8125rem', fontWeight: 500 }}>
                    {error}
                </Typography>
            )}

            {/* Amount input */}
            <Box>
                <Typography component="label" htmlFor="credit-amount" sx={{
                    display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', mb: 1, letterSpacing: '0.04em'
                }}>
                    Amount
                </Typography>
                <TextField
                    id="credit-amount"
                    type="number"
                    placeholder="Enter credit amount…"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    variant="outlined"
                    autoFocus
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.2s',
                            '&.Mui-focused': {
                                borderColor: '#0f6cbf',
                                boxShadow: '0 0 0 3px rgba(15, 108, 191, 0.12)',
                                '& fieldset': { borderWidth: '1px !important', borderColor: '#0f6cbf' },
                            }
                        }
                    }}
                />
            </Box>
        </Modal>
    );
};
