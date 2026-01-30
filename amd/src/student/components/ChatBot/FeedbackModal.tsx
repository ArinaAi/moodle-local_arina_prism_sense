import React from 'react';
import { Box, Modal, Typography, IconButton, Button, TextField, useTheme, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

const feedbackCategories = [
    { value: 'inaccurate', label: 'Inaccurate' },
    { value: 'incomplete', label: 'Incomplete' },
    { value: 'confusing', label: 'Confusing' },
    { value: 'off-topic', label: 'Off-topic' },
];

interface FeedbackModalProps {
    open: boolean;
    isSubmitting: boolean;
    feedbackText: string;
    feedbackCategory: string | null;
    onClose: () => void;
    onSubmit: () => void;
    onTextChange: (text: string) => void;
    onCategoryChange: (category: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    open,
    isSubmitting,
    feedbackText,
    feedbackCategory,
    onClose,
    onSubmit,
    onTextChange,
    onCategoryChange
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Pre-compute conditional styles to reduce complexity
    const modalContainerStyles = {
        position: isMobile ? 'fixed' : 'absolute',
        top: isMobile ? 0 : '50%',
        left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        width: isMobile ? '100%' : 'clamp(320px, 90vw, 480px)',
        maxHeight: isMobile ? '100dvh' : '85vh',
        height: isMobile ? '100dvh' : 'auto',
        borderRadius: isMobile ? 0 : '16px',
        boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    } as const;

    const headerTitleVariant = isMobile ? 'subtitle1' : 'h6';
    const footerFlexDirection = isMobile ? 'column-reverse' : 'row';
    const footerAlignItems = isMobile ? 'stretch' : 'center';

    return (
        <Modal open={open} onClose={onClose} sx={{ zIndex: 1000010 }}>
            <Box sx={modalContainerStyles}>
                {/* Header */}
                <Box
                    sx={{
                        p: 'clamp(16px, 2vh, 24px)',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '12px',
                                bgcolor: 'rgba(220, 38, 38, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ReportProblemOutlinedIcon sx={{ color: '#dc2626', fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant={headerTitleVariant}
                                component="h2"
                                sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}
                            >
                                What went wrong?
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d' }}>
                                Help us improve the AI responses
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{
                    p: 'clamp(16px, 2vh, 24px)',
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {/* Quick Feedback Categories */}
                    <Box sx={{ mb: 3 }}>
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                mb: 1.5, 
                                fontWeight: 700, 
                                color: '#334155', 
                                textTransform: 'uppercase', 
                                fontSize: '0.7rem', 
                                letterSpacing: '0.05em' 
                            }}
                        >
                            Select an issue
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            {feedbackCategories.map((cat) => (
                                <Box
                                    key={cat.value}
                                    onClick={() => onCategoryChange(cat.value)}
                                    sx={{
                                        border: '1.5px solid',
                                        borderColor: feedbackCategory === cat.value ? '#dc2626' : '#e2e8f0',
                                        borderRadius: '10px',
                                        py: 1.25,
                                        px: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        backgroundColor: feedbackCategory === cat.value ? '#fef2f2' : '#ffffff',
                                        '&:hover': {
                                            borderColor: feedbackCategory === cat.value ? '#dc2626' : '#cbd5e1',
                                            backgroundColor: feedbackCategory === cat.value ? '#fef2f2' : '#f8fafc',
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: feedbackCategory === cat.value ? 600 : 500,
                                            color: feedbackCategory === cat.value ? '#dc2626' : '#475569',
                                            fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                                        }}
                                    >
                                        {cat.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Additional Details */}
                    <Box>
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                mb: 1.5, 
                                fontWeight: 700, 
                                color: '#334155', 
                                textTransform: 'uppercase', 
                                fontSize: '0.7rem', 
                                letterSpacing: '0.05em' 
                            }}
                        >
                            Additional details (optional)
                        </Typography>
                        <TextField
                            multiline
                            rows={3}
                            value={feedbackText}
                            onChange={(e) => onTextChange(e.target.value)}
                            placeholder="Tell us more about what was wrong..."
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        backgroundColor: '#ffffff',
                                        borderColor: '#cbd5e1',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: '#ffffff',
                                        borderColor: '#2563eb',
                                        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
                                        '& fieldset': { borderWidth: '0 !important' },
                                    },
                                    '& fieldset': { border: 'none' },
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        p: 'clamp(16px, 2vh, 24px)',
                        paddingBottom: 'max(clamp(16px, 2vh, 24px), env(safe-area-inset-bottom))',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: footerFlexDirection,
                        alignItems: footerAlignItems,
                        justifyContent: 'flex-end',
                        gap: 'clamp(12px, 1.5vh, 16px)',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}
                >
                    <Button
                        onClick={onClose}
                        variant="text"
                        fullWidth={isMobile}
                        sx={{
                            color: '#64748b',
                            fontWeight: 600,
                            borderRadius: '10px',
                            px: 3,
                            py: 1.25,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                            },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        variant="contained"
                        startIcon={isSubmitting ? null : <SendIcon sx={{ fontSize: 18 }} />}
                        disabled={isSubmitting || !feedbackCategory}
                        fullWidth={isMobile}
                        sx={{
                            fontWeight: 700,
                            py: 1.25,
                            px: 3,
                            borderRadius: '10px',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)',
                                transform: 'translateY(-1px)',
                            },
                            '&:disabled': {
                                background: '#e5e7eb',
                                color: '#9ca3af',
                                transform: 'none',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};
