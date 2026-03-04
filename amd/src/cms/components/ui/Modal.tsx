import React from 'react';
import {
    Modal as MuiModal,
    Box,
    Typography,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string | React.ReactNode;
    subtitle?: string;
    children: React.ReactNode;
    maxWidth?: number;
    headerIcon?: React.ReactNode;
    headerIconBgColor?: string;
    footer?: React.ReactNode;
    disableEscapeKeyDown?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    open,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 560, // Match PluginFeedbackModal width
    headerIcon,
    headerIconBgColor = 'rgba(15, 108, 191, 0.1)',
    footer,
    disableEscapeKeyDown = false,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const modalBoxStyles = {
        position: isMobile ? 'fixed' as const : 'absolute' as const,
        top: isMobile ? 0 : '50%',
        left: isMobile ? 0 : '50%',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        width: isMobile ? '100%' : `clamp(400px, 90vw, ${maxWidth}px)`,
        maxHeight: isMobile ? '100dvh' : '85vh',
        height: isMobile ? '100dvh' : 'auto',
        // Blueprint §5.4: border-radius 20px
        borderRadius: isMobile ? 0 : '20px',
        boxShadow: isMobile ? 'none' : '0 16px 48px rgba(0, 0, 0, 0.16)',
        bgcolor: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--paper)',
    };

    return (
        <MuiModal
            open={open}
            onClose={(e, reason) => {
                if (reason === 'backdropClick' && disableEscapeKeyDown) { return };
                if (reason === 'escapeKeyDown' && disableEscapeKeyDown) { return };
                onClose();
            }}
            disableEscapeKeyDown={disableEscapeKeyDown}
            sx={{
                zIndex: 100000,
                // Blueprint §5.4: flat dark backdrop, no blur (no glassmorphism §1.1)
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                },
            }}
        >
            <Box sx={modalBoxStyles}>
                {/* Header matching PluginFeedbackModal */}
                <Box sx={{
                    p: 'clamp(16px, 2vh, 24px)',
                    // Blueprint §3.1 divider token — dark mode aware
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--paper)',
                    flexShrink: 0,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {headerIcon && (
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '12px',
                                    bgcolor: headerIconBgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {headerIcon}
                            </Box>
                        )}
                        <Box>
                            {typeof title === 'string' ? (
                                <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2, m: 0 }}>
                                    {title}
                                </Typography>
                            ) : title}
                            {subtitle && (
                                <Typography variant="caption" sx={{ color: '#6c757d', mt: 0.5, display: 'block' }}>
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' },
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{
                    p: 'clamp(16px, 2vh, 24px)',
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {children}
                </Box>

                {/* Footer Component */}
                {footer}
            </Box>
        </MuiModal>
    );
};
