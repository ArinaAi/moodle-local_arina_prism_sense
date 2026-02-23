import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
    LayoutDashboard, Users, DollarSign, BookOpen, Tag,
    ChevronLeft, Sun, Moon, LogOut,
} from 'lucide-react';
import { spring, tween } from '../../config/animations';
import { LogoToggle } from '../ui/LogoToggle';
import type { ThemeName } from '../../config/theme';

// ── Nav items ────────────────────────────────────────────────
const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'audit', label: 'Audit Ledger', icon: BookOpen },
    { id: 'pricing', label: 'Pricing Info', icon: Tag },
];

interface SidebarProps {
    activeNav: string;
    onNavChange: (id: string) => void;
    collapsed: boolean;
    onCollapse: () => void;
    themeName: ThemeName;
    setTheme: (t: ThemeName) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeNav,
    onNavChange,
    collapsed,
    onCollapse,
    themeName,
    setTheme,
}) => {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <div
            style={{
                padding: '12px 0 12px 12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'stretch',
                alignSelf: 'flex-start',
                height: 'calc(100vh - 61px)',
                position: 'sticky',
                top: 61,
            }}
        >
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 64 : 232 }}
                transition={spring.smooth}
                style={{
                    background: 'var(--paper)',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    height: '100%',
                    position: 'relative',
                }}
            >
                {/* Collapsed: LogoToggle */}
                {collapsed && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                        <LogoToggle onCollapse={onCollapse} />
                    </div>
                )}

                {/* Expanded: collapse toggle */}
                {!collapsed && (
                    <div style={{ padding: '10px 10px 4px', display: 'flex', justifyContent: 'flex-end' }}>
                        <motion.button
                            onClick={onCollapse}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            style={{
                                width: 26,
                                height: 26,
                                borderRadius: 7,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--ts)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <ChevronLeft size={14} />
                        </motion.button>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ flex: 1, padding: '8px 8px' }}>
                    <LayoutGroup>
                        {navItems.map(({ id, label, icon: Icon }) => {
                            const active = activeNav === id;
                            return (
                                <motion.button
                                    key={id}
                                    onClick={() => onNavChange(id)}
                                    whileTap={{ scale: 0.97 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        width: '100%',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: active ? '#ffffff' : 'transparent',
                                        color: active ? '#0f6cbf' : 'var(--ts)',
                                        fontWeight: active ? 600 : 400,
                                        fontSize: '0.9375rem',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        fontFamily: 'inherit',
                                        zIndex: 1,
                                    }}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            layout="size"
                                            transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 10,
                                                border: '1px solid #0f6cbf',
                                                background: 'transparent',
                                                zIndex: -1,
                                            }}
                                        />
                                    )}
                                    <Icon size={18} />
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={tween.fast}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            );
                        })}
                    </LayoutGroup>
                </nav>

                {/* Profile footer */}
                <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
                    <motion.button
                        whileHover={{ backgroundColor: 'rgba(15,108,191,0.04)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSettingsOpen((o) => !o)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            width: '100%',
                            borderRadius: 12,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9999,
                                background: 'linear-gradient(135deg, #0f6cbf, #084C86)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.8125rem' }}>CA</span>
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={tween.fast}
                                    style={{ textAlign: 'left' }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--tp)', whiteSpace: 'nowrap' }}>
                                        College Admin
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--ts)', whiteSpace: 'nowrap' }}>
                                        admin@prism.edu
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </motion.aside>

            {/* Settings Popover — outside aside (no overflow clip) */}
            <AnimatePresence>
                {settingsOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, ...(collapsed ? { x: -8 } : { y: 8 }) }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, ...(collapsed ? { x: -8 } : { y: 8 }) }}
                        transition={spring.snappy}
                        style={{
                            position: 'absolute',
                            ...(collapsed
                                ? { left: 'calc(100% - 12px)', bottom: 12, width: 200 }
                                : { bottom: 12, left: 12, right: 0 }),
                            background: 'var(--paper)',
                            border: '1px solid var(--border)',
                            borderRadius: 20,
                            padding: 14,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                            zIndex: 100,
                        }}
                    >
                        {/* Collapsed: show user info */}
                        {collapsed && (
                            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--tp)' }}>College Admin</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--ts)', marginTop: 2 }}>admin@prism.edu</div>
                            </div>
                        )}

                        <div style={{ fontSize: '0.6875rem', color: 'var(--ts)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                            Appearance
                        </div>

                        {/* Theme toggle */}
                        <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 3, marginBottom: 10 }}>
                            {([['Light', Sun], ['Dark', Moon]] as const).map(([lbl, Icon]) => (
                                <motion.button
                                    key={lbl}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { setTheme(lbl.toLowerCase() as ThemeName); setSettingsOpen(false); }}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5,
                                        padding: '7px 8px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: themeName === lbl.toLowerCase() ? 'var(--paper)' : 'transparent',
                                        color: 'var(--tp)',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: themeName === lbl.toLowerCase() ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <Icon size={13} />{lbl}
                                </motion.button>
                            ))}
                        </div>

                        {/* Sign out */}
                        <motion.button
                            whileHover={{ borderColor: 'var(--ts)' }}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--ts)',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                fontFamily: 'inherit',
                            }}
                        >
                            <LogOut size={14} />Sign out
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
