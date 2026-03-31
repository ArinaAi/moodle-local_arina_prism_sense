import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';

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
        <Box
            id="lecturebot-tour-credit-badge"
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
                userSelect: 'none',
                background: config.background,
                color: config.color,
                border: `1.5px solid ${config.borderColor}`,
                boxShadow: config.glow,
                position: 'relative',
                overflow: 'hidden',
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
                {/* Icon */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
    );
};

export default CreditPill;
