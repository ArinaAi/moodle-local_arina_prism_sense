import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, useTheme, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_TITLES } from '../../config/mockData';
import { HelpCircle } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { DeltaBadge } from '../ui/DeltaBadge';
import { tween } from '../../config/animations';
import { PurchaseCreditsModal } from './PurchaseCreditsModal';
import { BALANCE_REFRESH_EVENT } from '../../lib/balanceEvents';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

interface AppHeaderProps {
    activeNav: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeNav }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const moodleContext = window.MOODLE_CMS_CONTEXT || { wwwroot: '' };

    const [balance, setBalance] = useState<number>(0);
    const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const prevBalance = useRef<number | null>(null);
    const lastFetchAt = useRef<number>(0);

    const fetchBalance = async () => {
        try {
            const baseUrl = moodleContext.wwwroot || '';
            const res = await apiFetch(`${baseUrl}/local/lecturebot/api/cms/get_balance.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                const newBalance: number = data.data.current_balance || 0;
                // Compute delta vs previous (skip on first load)
                if (prevBalance.current !== null && newBalance !== prevBalance.current) {
                    setBalanceDelta(newBalance - prevBalance.current);
                }
                prevBalance.current = newBalance;
                setBalance(newBalance);
            }
        } catch (e) {
            if (e instanceof SessionExpiredError) { return; }
            console.error('Failed to fetch balance', e);
        } finally {
            lastFetchAt.current = Date.now();
        }
    };

    useEffect(() => {
        void fetchBalance();
    }, []);

    // Listen for balance refresh events (from CreditAllocationModal, PurchaseCreditsModal)
    useEffect(() => {
        const handler = () => { void fetchBalance(); };
        globalThis.addEventListener(BALANCE_REFRESH_EVENT, handler);
        return () => globalThis.removeEventListener(BALANCE_REFRESH_EVENT, handler);
    }, []);

    // Refresh on tab visibility regain if >30s stale
    useEffect(() => {
        const handler = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastFetchAt.current > 30_000) {
                void fetchBalance();
            }
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

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
                id="lecturebot-tour-cms-header"
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
                        <Box id="lecturebot-tour-cms-balance" sx={{ textAlign: 'right' }}>
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
                            id="lecturebot-tour-cms-add-credits"
                            onClick={() => setPurchaseOpen(true)}
                            whileHover={{ backgroundColor: '#0a5a9d', y: -1, boxShadow: '0 4px 12px rgba(15,108,191,0.25)' }}
                            whileTap={{ scale: 0.97 }}
                            style={{ padding: '8px 16px', border: 'none', borderRadius: '20px', background: '#0f6cbf', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                        >
                            + Add Credits
                        </motion.button>
                    </Box>
                    <Tooltip title="Retake Tour" arrow PopperProps={{ sx: { zIndex: 100000 } }}>
                        <IconButton
                            onClick={() => {
                                if (typeof window !== 'undefined' && (window as any).startLecturebotTour) {
                                    (window as any).startLecturebotTour();
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
                    <Box component="img" src={`${moodleContext.wwwroot}/local/lecturebot/pix/arina-logo.png?v=1`} alt="Arina AI" sx={{ height: { xs: 32, sm: 40, md: 48 }, width: 'auto', objectFit: 'contain', ml: { xs: 0, sm: 1 } }} onError={(e: any) => { e.currentTarget.style.display = 'none'; }} />
                </Box>
            </Box>

            <PurchaseCreditsModal
                open={purchaseOpen}
                onClose={(success) => {
                    setPurchaseOpen(false);
                    if (success) {
                        fetchBalance();
                    }
                }}
            />
        </React.Fragment>
    );
};

