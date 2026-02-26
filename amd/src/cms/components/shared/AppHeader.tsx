import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_TITLES } from '../../config/mockData';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { tween } from '../../config/animations';
import { PurchaseCreditsModal } from './PurchaseCreditsModal';

interface AppHeaderProps {
    activeNav: string;
    balance?: number; // kept for backwards compat but ignored
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeNav }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const moodleContext = (window as any).MOODLE_CMS_CONTEXT || {};

    const [balance, setBalance] = useState<number>(0);
    const [purchaseOpen, setPurchaseOpen] = useState(false);

    const fetchBalance = async () => {
        try {
            const baseUrl = moodleContext.wwwroot || '';
            const res = await fetch(`${baseUrl}/local/lecturebot/api/cms/get_balance.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                setBalance(data.data.available_balance || 0);
            }
        } catch (e) {
            console.error('Failed to fetch balance', e);
        }
    };

    useEffect(() => {
        fetchBalance();
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
                sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
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
                    boxShadow: '0 1px 0 rgba(255,255,255,0.5), var(--shadow)'
                }}
            >
                {/* Left — Back Button + Titles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: 0 }}>
                    <button
                        onClick={() => {
                            globalThis.location.href = `${moodleContext.wwwroot}/admin/settings.php?section=local_lecturebot`;
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px',
                            backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '20px',
                            cursor: 'pointer', transition: 'all 0.2s', padding: 0, flexShrink: 0,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.borderColor = '#dee2e6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#e9ecef'; }}
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
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1.2 }}>
                                Institutional Balance
                            </Typography>
                            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, mt: 0.25 }}>
                                <AnimatedNumber value={balance} /> Credits
                            </Typography>
                        </Box>
                        <motion.button
                            onClick={() => setPurchaseOpen(true)}
                            whileHover={{ backgroundColor: '#0a5a9d', y: -1, boxShadow: '0 4px 12px rgba(15,108,191,0.25)' }}
                            whileTap={{ scale: 0.97 }}
                            style={{ padding: '8px 16px', border: 'none', borderRadius: '20px', background: '#0f6cbf', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                        >
                            + Add Credits
                        </motion.button>
                    </Box>
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

