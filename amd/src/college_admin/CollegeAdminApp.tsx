import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Layers, ChevronLeft, Sun, Moon } from 'lucide-react';

import { createCMSTheme, THEMES, type ThemeName } from '../cms/config/theme';
import { AppHeader } from '../cms/components/shared/AppHeader';
import { BalanceProvider } from '../cms/context/BalanceContext';
import { tween } from '../cms/config/animations';

import { CatalogView } from './views/CatalogView';
import { CurriculumView } from './views/CurriculumView';
import { CohortView } from './views/CohortView';

// Alias MOODLE_COLLEGE_ADMIN_CONTEXT → MOODLE_CMS_CONTEXT so AppHeader works.
// Must run before any component mounts.
function ensureContextAlias() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.MOODLE_COLLEGE_ADMIN_CONTEXT && !win.MOODLE_CMS_CONTEXT) {
        win.MOODLE_CMS_CONTEXT = win.MOODLE_COLLEGE_ADMIN_CONTEXT;
    }
}

// ── Nav items ──────────────────────────────────────────────────────────────────
const navItems = [
    { id: 'catalog', label: 'Academic Catalog', Icon: GraduationCap },
    { id: 'curriculum', label: 'Curriculum', Icon: Layers },
    // { id: 'cohorts', label: 'Cohort Registry', Icon: Users },
];

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.8 };

// ── Self-contained Sidebar ─────────────────────────────────────────────────────
interface SidebarProps {
    activeNav: string;
    onNavChange: (id: string) => void;
    collapsed: boolean;
    onCollapse: () => void;
    themeName: ThemeName;
    setTheme: (t: ThemeName) => void;
}

const CollegeAdminSidebar: React.FC<SidebarProps> = ({
    activeNav, onNavChange, collapsed, onCollapse, themeName, setTheme,
}) => (
    <div style={{
        padding: '12px 0 12px 12px',
        flexShrink: 0, display: 'flex', alignItems: 'stretch',
        alignSelf: 'flex-start',
        height: 'calc(100vh - 76px - 24px)',
        maxHeight: 'calc(100vh - 76px - 24px)',
        position: 'sticky', top: 76,
    }}>
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 64 : 232 }}
            transition={SPRING}
            style={{
                background: 'var(--paper)', borderRadius: 20,
                border: '1px solid var(--border)', display: 'flex',
                flexDirection: 'column', overflow: 'hidden',
                boxShadow: 'var(--shadow)', height: '100%',
            }}
        >
            {collapsed && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
                    <motion.button
                        onClick={onCollapse}
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <span style={{ color: '#0f6cbf', fontWeight: 800, fontSize: '0.875rem' }}>P</span>
                    </motion.button>
                </div>
            )}

            {!collapsed && (
                <div style={{ padding: '14px 12px 8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0f6cbf 0%, #084C86 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(15,108,191,0.3)' }}>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem', lineHeight: 1 }}>P</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tp)', letterSpacing: '-0.01em' }}>PRISM</span>
                    </div>
                    <motion.button
                        onClick={onCollapse}
                        whileHover={{ scale: 1.08, backgroundColor: 'var(--rh)' }} whileTap={{ scale: 0.92 }}
                        style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--ts)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                        title="Collapse sidebar"
                    >
                        <ChevronLeft size={13} />
                    </motion.button>
                </div>
            )}

            <nav style={{ flex: 1, padding: '6px 8px', overflow: 'hidden' }}>
                {navItems.map(({ id, label, Icon }) => {
                    const active = activeNav === id;
                    return (
                        <motion.button
                            key={id}
                            onClick={() => onNavChange(id)}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: collapsed ? '11px 0' : '11px 14px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                width: '100%', borderRadius: 10, border: 'none',
                                background: 'transparent',
                                color: active ? '#0f6cbf' : 'var(--ts)',
                                fontWeight: active ? 600 : 400,
                                fontSize: '0.9375rem', cursor: 'pointer',
                                position: 'relative', fontFamily: 'inherit',
                                marginBottom: 2, transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--rh)'; } }}
                            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
                        >
                            {active && (
                                <motion.div
                                    layoutId="ca-activeIndicator"
                                    transition={SPRING}
                                    style={{ position: 'absolute', inset: 0, borderRadius: 10, border: '1.5px solid rgba(15,108,191,0.35)', background: 'rgba(15,108,191,0.08)', zIndex: 0, pointerEvents: 'none' as const }}
                                />
                            )}
                            <Icon size={18} style={{ flexShrink: 0 }} />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }} transition={tween.fast}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </nav>

            <div style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start', alignItems: 'center', gap: 4 }}>
                <motion.button
                    onClick={() => setTheme(themeName === 'dark' ? 'light' : 'dark')}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    title={themeName === 'dark' ? 'Switch to light' : 'Switch to dark'}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--ts)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--rh)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                    {themeName === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </motion.button>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }} transition={tween.fast}
                            style={{ fontSize: '0.6875rem', color: 'var(--td)', fontWeight: 500, whiteSpace: 'nowrap' }}
                        >
                            {themeName === 'dark' ? 'Light mode' : 'Dark mode'}
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
        </motion.aside>
    </div>
);

// ── Main App ───────────────────────────────────────────────────────────────────
export const CollegeAdminApp: React.FC = () => {
    // Ensure context alias is set up before anything else renders
    ensureContextAlias();

    const [activeNav, setActiveNav] = useState('catalog');
    const [collapsed, setCollapsed] = useState(false);
    const [themeName, setThemeName] = useState<ThemeName>('light');
    const [selectedDegreeId, setSelectedDegreeId] = useState<number | null>(null);

    const cmsTheme = useMemo(() => createCMSTheme(themeName), [themeName]);

    useEffect(() => {
        const tokens = THEMES[themeName];
        const root = document.documentElement;
        Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    }, [themeName]);

    const handleNavChange = useCallback((id: string) => { setActiveNav(id); }, []);
    const handleCollapse = useCallback(() => setCollapsed(c => !c), []);

    const handleManageCurriculum = useCallback((degreeId: number) => {
        setSelectedDegreeId(degreeId);
        setActiveNav('curriculum');
    }, []);

    const renderContent = () => {
        switch (activeNav) {
            case 'catalog': return <CatalogView onManageCurriculum={handleManageCurriculum} />;
            case 'curriculum': return <CurriculumView initialDegreeId={selectedDegreeId} />;
            case 'cohorts': return <CohortView />;
            default: return <div style={{ padding: 24, color: 'var(--ts)' }}>Coming soon: {activeNav}</div>;
        }
    };

    return (
        <BalanceProvider>
        <ThemeProvider theme={cmsTheme}>
            <div
                id="prism-college-admin-app"
                data-theme={themeName}
                style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
            >
                <AppHeader activeNav={activeNav} hideBalance={true} />
                <div style={{ display: 'flex', flex: 1 }}>
                    <CollegeAdminSidebar
                        activeNav={activeNav} onNavChange={handleNavChange}
                        collapsed={collapsed} onCollapse={handleCollapse}
                        themeName={themeName} setTheme={setThemeName}
                    />
                    <main style={{ flex: 1, padding: '14px 22px', overflow: 'auto', minWidth: 0 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeNav}
                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                                style={{ height: '100%' }}
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </ThemeProvider>
        </BalanceProvider>
    );
};
