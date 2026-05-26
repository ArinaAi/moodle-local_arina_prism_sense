import React, { useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_TITLES } from '../../config/mockData';
import { HelpCircle } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { DeltaBadge } from '../ui/DeltaBadge';
import { tween } from '../../config/animations';
import { PurchaseCreditsModal } from './PurchaseCreditsModal';
import { useBalanceContext } from '../../context/BalanceContext';

interface AppHeaderProps {
    activeNav: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeNav }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const moodleContext = window.MOODLE_CMS_CONTEXT || { wwwroot: '' };

    const { balanceData, delta } = useBalanceContext();
    const balance = balanceData?.current_balance ?? 0;
    const balanceDelta = delta?.institutional ?? null;

    const [purchaseOpen, setPurchaseOpen] = useState(false);

    const getTitleVariant = () => {
        if (isMobile) { return 'subtitle1'; }
        if (isTablet) { return 'h6'; }
        return 'h5';
    };
    const titleVariant = getTitleVariant();

    return (
        <React.Fragment>
            <Box
                component="header"
                id="arina_prism_sense-tour-cms-header"
                sx={{
                    backgroundColor: 'var(--paper)',
                    borderBottom: '1px solid var(--border)',
                    px: { xs: 1.5, sm: 2, md: 3 },
                    py: { xs: 1, sm: 1.5, md: 2 },
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    zIndex: 20,
                    position: 'sticky',
                    top: 0,
                    gap: { xs: 1, sm: 2 },
                    height: { xs: '56px', sm: '64px', md: '76px' },
                }}
            >
                {/* Left — Back Button + Titles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: 0 }}>
                    <button
                        onClick={() => {
                            if (window.history.length > 1 || document.referrer) {
                                window.history.back();
                            } else {
                                globalThis.location.href = `${moodleContext.wwwroot}/my/`;
                            }
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px',
                            backgroundColor: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '20px',
                            cursor: 'pointer', transition: 'all 0.2s', padding: 0, flexShrink: 0,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--rh)'; e.currentTarget.style.borderColor = 'var(--ts)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        onFocus={(e) => { e.currentTarget.style.backgroundColor = 'var(--rh)'; e.currentTarget.style.borderColor = 'var(--ts)'; }}
                        onBlur={(e) => { e.currentTarget.style.backgroundColor = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        title="Back to Settings"
                    >
                        <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="#0f6cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant={titleVariant} component="h1" sx={{ color: 'primary.main', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: { xs: '1rem', sm: '1.15rem', md: '1.35rem' }, lineHeight: 1.2 }}>
                            PRISM Sense
                        </Typography>
                        {!isMobile && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }, lineHeight: 1.2 }}>
                                    Administration
                                </Typography>
                                <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'text.disabled' }} />
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={activeNav}
                                        initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }} transition={tween.fast}
                                        style={{ fontSize: '0.875rem', color: 'var(--tp)', fontWeight: 500, lineHeight: 1.2 }}
                                    >
                                        {NAV_TITLES[activeNav] || activeNav}
                                    </motion.span>
                                </AnimatePresence>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Right — Balance, Button, Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, flexShrink: 0 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
                        <Box id="arina_prism_sense-tour-cms-balance" sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1.2 }}>
                                Institutional Balance
                            </Typography>
                            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, mt: 0.25, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <AnimatedNumber value={balance} />
                                <DeltaBadge delta={balanceDelta} size="header" />
                                &nbsp;Credits
                            </Typography>
                        </Box>
                        <motion.button
                            id="arina_prism_sense-tour-cms-add-credits"
                            disabled
                            style={{ padding: '8px 16px', border: 'none', borderRadius: '20px', background: '#b0bec5', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: 0.6, pointerEvents: 'none' }}
                        >
                            + Add Credits
                        </motion.button>
                    </Box>
                    <Tooltip title="Retake Tour" arrow PopperProps={{ sx: { zIndex: 100000 } }}>
                        <IconButton
                            onClick={() => {
                                const win = window as Window & { startArinaPrismSenseTour?: () => void };
                                if (typeof window !== 'undefined' && win.startArinaPrismSenseTour) {
                                    win.startArinaPrismSenseTour();
                                }
                            }}
                            size="small"
                            sx={{
                                width: { xs: 28, sm: 40 },
                                height: { xs: 28, sm: 40 },
                                backgroundColor: 'transparent',
                                border: '1px solid',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                transition: 'transform 0.15s ease, background-color 0.15s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(15, 108, 191, 0.08)',
                                    borderColor: 'primary.dark',
                                    transform: 'scale(1.05)',
                                },
                                '&:active': {
                                    transform: 'scale(0.95)',
                                },
                            }}
                        >
                            <HelpCircle
                                size={isMobile ? 16 : 20}
                                strokeWidth={2}
                            />
                        </IconButton>
                    </Tooltip>
                    <Box component="img" src={`${moodleContext.wwwroot}/local/arina_prism_sense/pix/icon.png?v=1`} alt="Arina AI" sx={{ height: { xs: 32, sm: 40, md: 48 }, width: 'auto', objectFit: 'contain', ml: { xs: 0, sm: 1 } }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                </Box>
            </Box>

            <PurchaseCreditsModal
                open={purchaseOpen}
                onClose={() => {
                    setPurchaseOpen(false);
                }}
            />
        </React.Fragment>
    );
};

