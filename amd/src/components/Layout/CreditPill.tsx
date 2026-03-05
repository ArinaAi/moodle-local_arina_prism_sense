import React, { useState } from 'react';
import { Box, Popover, Typography, Divider, Skeleton } from '@mui/material';
import { TrendingUp, AlertCircle, Zap, Wallet } from 'lucide-react';

interface CreditPillProps {
    availableBalance: number;
    hasWallet: boolean;
    loading: boolean;
    isMobile?: boolean;
}

const CreditPill: React.FC<CreditPillProps> = ({
    availableBalance,
    hasWallet,
    loading,
    isMobile = false,
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!loading && hasWallet) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    // Determine state
    const getState = () => {
        if (loading) {
            return 'loading';
        }
        if (!hasWallet) {
            return 'no-wallet';
        }
        if (availableBalance === 0) {
            return 'empty';
        }
        if (availableBalance < 20) {
            return 'low';
        }
        return 'good';
    };

    const state = getState();

    // Visual configuration per state
    const stateConfig = {
        loading: {
            background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
            color: '#999',
            borderColor: '#e0e0e0',
            icon: <Zap size={isMobile ? 14 : 16} />,
            text: '...',
            glow: 'none',
            pulse: false,
            tooltip: 'Loading balance...',
        },
        'no-wallet': {
            background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
            color: '#757575',
            borderColor: '#e0e0e0',
            icon: <AlertCircle size={isMobile ? 14 : 16} />,
            text: 'No credits',
            glow: 'none',
            pulse: false,
            tooltip: 'Ask your college admin to allocate you credits',
        },
        empty: {
            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            color: '#c62828',
            borderColor: '#ef5350',
            icon: <AlertCircle size={isMobile ? 14 : 16} />,
            text: '0 credits',
            glow: '0 0 12px rgba(198, 40, 40, 0.3)',
            pulse: true,
            tooltip: 'You have no credits remaining',
        },
        low: {
            background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
            color: '#f57f17',
            borderColor: '#ffa726',
            icon: <TrendingUp size={isMobile ? 14 : 16} />,
            text: `${Math.floor(availableBalance)} credits`,
            glow: '0 0 12px rgba(245, 127, 23, 0.25)',
            pulse: true,
            tooltip: `${Math.floor(availableBalance)} credits remaining - running low`,
        },
        good: {
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            color: '#2e7d32',
            borderColor: '#66bb6a',
            icon: <Zap size={isMobile ? 14 : 16} />,
            text: `${Math.floor(availableBalance)} credits`,
            glow: '0 0 12px rgba(46, 125, 50, 0.2)',
            pulse: false,
            tooltip: `${Math.floor(availableBalance)} credits available`,
        },
    };

    const config = stateConfig[state];

    if (loading) {
        return (
            <Skeleton
                variant="rectangular"
                width={isMobile ? 90 : 110}
                height={isMobile ? 28 : 32}
                sx={{ borderRadius: '20px' }}
            />
        );
    }

    return (
        <>
            <Box
                onClick={handleClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: isMobile ? 1.25 : 1.75,
                    py: isMobile ? 0.5 : 0.75,
                    borderRadius: '20px',
                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: hasWallet && !loading ? 'pointer' : 'default',
                    userSelect: 'none',
                    background: config.background,
                    color: config.color,
                    border: `1.5px solid ${config.borderColor}`,
                    boxShadow: config.glow,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    // Hover effects
                    '&:hover': hasWallet && !loading ? {
                        transform: 'translateY(-2px)',
                        boxShadow: `${config.glow}, 0 4px 12px rgba(0,0,0,0.1)`,
                        borderColor: config.color,
                    } : {},
                    // Active/click effect
                    '&:active': hasWallet && !loading ? {
                        transform: 'translateY(0px)',
                    } : {},
                    // Pulse animation for low/empty states
                    ...(config.pulse && {
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        '@keyframes pulse-glow': {
                            '0%, 100%': {
                                boxShadow: config.glow,
                            },
                            '50%': {
                                boxShadow: `${config.glow}, 0 0 20px ${config.borderColor}40`,
                            },
                        },
                    }),
                }}
                title={config.tooltip}
                role="status"
                aria-label={config.tooltip}
            >
                {/* Icon with subtle animation */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease',
                        ...(state === 'good' && {
                            animation: 'icon-pulse 2s ease-in-out infinite',
                            '@keyframes icon-pulse': {
                                '0%, 100%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.1)' },
                            },
                        }),
                    }}
                >
                    {config.icon}
                </Box>

                {/* Text */}
                <Box
                    component="span"
                    sx={{
                        fontWeight: 700,
                        letterSpacing: '0.01em',
                    }}
                >
                    {config.text}
                </Box>
            </Box>

            {/* Detailed Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                sx={{
                    mt: 1,
                    '& .MuiPopover-paper': {
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                    },
                }}
            >
                <Box sx={{ p: 2.5, minWidth: 220 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                background: config.background,
                                color: config.color,
                            }}
                        >
                            <Wallet size={18} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Credit Balance
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Balance Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                Available Credits
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color={config.color}>
                                {Math.floor(availableBalance)}
                            </Typography>
                        </Box>

                        {/* Status indicator */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.5,
                                py: 1,
                                borderRadius: '8px',
                                background: config.background,
                                border: `1px solid ${config.borderColor}`,
                            }}
                        >
                            {config.icon}
                            <Typography variant="body2" fontWeight={600} color={config.color}>
                                {state === 'good' && 'Healthy Balance'}
                                {state === 'low' && 'Running Low'}
                                {state === 'empty' && 'No Credits'}
                            </Typography>
                        </Box>

                        {/* Help text */}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {state === 'low' && 'Contact your admin to top up credits.'}
                            {state === 'empty' && 'You need credits to generate content. Contact your admin.'}
                            {state === 'good' && 'You have sufficient credits for content generation.'}
                        </Typography>
                    </Box>
                </Box>
            </Popover>
        </>
    );
};

export default CreditPill;
