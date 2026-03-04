import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, DollarSign, BookOpen, Tag,
    ChevronLeft, Sun, Moon,
} from 'lucide-react';
import { tween } from '../../config/animations';
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

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.8 };

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
    return (
        <div
            style={{
                padding: '12px 0 12px 12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'stretch',
                alignSelf: 'flex-start',
                height: 'calc(100vh - 76px - 24px)',
                maxHeight: 'calc(100vh - 76px - 24px)',
                position: 'sticky',
                top: 76,
            }}
        >
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 64 : 232 }}
                transition={SPRING}
                style={{
                    background: 'var(--paper)',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    height: '100%',
                }}
            >
                {/* Collapsed: PRISM P mark */}
                {collapsed && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                        <LogoToggle onCollapse={onCollapse} />
                    </div>
                )}

                {/* Expanded: brand label + collapse button together */}
                {!collapsed && (
                    <div style={{
                        padding: '14px 12px 8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        {/* PRISM brand */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #0f6cbf 0%, #084C86 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(15,108,191,0.3)',
                            }}>
                                <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem', lineHeight: 1 }}>P</span>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tp)', letterSpacing: '-0.01em' }}>
                                PRISM
                            </span>
                        </div>

                        {/* Collapse button — sits next to brand, natural position */}
                        <motion.button
                            onClick={onCollapse}
                            whileHover={{ scale: 1.08, backgroundColor: 'var(--rh)' }}
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
                                transition: 'background 0.15s',
                            }}
                            title="Collapse sidebar"
                        >
                            <ChevronLeft size={13} />
                        </motion.button>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ flex: 1, padding: '6px 8px', overflow: 'hidden' }}>
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
                                    padding: collapsed ? '11px 0' : '11px 14px',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    width: '100%',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? '#0f6cbf' : 'var(--ts)',
                                    fontWeight: active ? 600 : 400,
                                    fontSize: '0.9375rem',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    fontFamily: 'inherit',
                                    marginBottom: 2,
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--rh)'; }
                                }}
                                onMouseLeave={(e) => {
                                    if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; }
                                }}
                            >
                                {/* Full border indicator — layoutId only (no layout="size" to avoid stutter) */}
                                {active && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        transition={SPRING}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: 10,
                                            border: '1.5px solid rgba(15,108,191,0.35)',
                                            background: 'rgba(15,108,191,0.08)',
                                            zIndex: 0,
                                            pointerEvents: 'none' as const,
                                        }}
                                    />
                                )}
                                <Icon size={18} style={{ flexShrink: 0 }} />
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
                </nav>

                {/* Footer: just a subtle theme toggle — no user info */}
                <div style={{
                    padding: '8px 10px 10px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    alignItems: 'center',
                    gap: 4,
                }}>
                    <motion.button
                        onClick={() => setTheme(themeName === 'dark' ? 'light' : 'dark')}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        title={themeName === 'dark' ? 'Switch to light' : 'Switch to dark'}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--ts)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--rh)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        {themeName === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </motion.button>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                transition={tween.fast}
                                style={{
                                    fontSize: '0.6875rem',
                                    color: 'var(--td)',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {themeName === 'dark' ? 'Light mode' : 'Dark mode'}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </motion.aside>
        </div>
    );
};
