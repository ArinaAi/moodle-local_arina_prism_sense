import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Sidebar } from '../components/shared/Sidebar';
import { AppHeader } from '../components/shared/AppHeader';
import { THEMES, createCMSTheme, type ThemeName } from '../config/theme';
import { BalanceProvider } from '../context/BalanceContext';

import { OverviewView } from '../features/overview/OverviewView';
import { StaffManagementView, type ApiStaffMember } from '../features/staff/StaffManagementView';
import { StaffHistoryView } from '../features/staff/StaffHistoryView';
import { FinancialsView } from '../features/financials/FinancialsView';
import { AuditLedgerView } from '../features/audit/AuditLedgerView';
import { PricingInfoView } from '../features/pricing/PricingInfoView';

export const DashboardLayout: React.FC = () => {
    const [activeNav, setActiveNav] = useState('overview');
    const [collapsed, setCollapsed] = useState(false);
    const [themeName, setThemeName] = useState<ThemeName>('light');
    const [viewingStaff, setViewingStaff] = useState<ApiStaffMember | null>(null);

    // Reactive MUI theme — re-creates when themeName changes so Skeleton,
    // Snackbar, Alert, TextField etc. all switch correctly in dark mode
    const cmsTheme = useMemo(() => createCMSTheme(themeName), [themeName]);

    // Apply CSS variables to root element when theme changes
    useEffect(() => {
        const tokens = THEMES[themeName];
        const root = document.documentElement;
        Object.entries(tokens).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    }, [themeName]);

    const handleNavChange = useCallback((id: string) => {
        setActiveNav(id);
        setViewingStaff(null);
    }, []);

    const handleToggleCollapse = useCallback(() => {
        setCollapsed((c) => !c);
    }, []);

    // Render content based on active navigation
    const renderContent = () => {
        // Staff History sub-view
        if (activeNav === 'staff' && viewingStaff) {
            return (
                <StaffHistoryView
                    staff={viewingStaff}
                    onBack={() => setViewingStaff(null)}
                />
            );
        }

        switch (activeNav) {
            case 'overview':
                return <OverviewView />;
            case 'staff':
                return <StaffManagementView onViewStaff={setViewingStaff} />;
            case 'financials':
                return <FinancialsView />;
            case 'audit':
                return <AuditLedgerView />;
            case 'pricing':
                return <PricingInfoView />;
            default:
                return (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--ts)' }}>
                        Feature coming soon: {activeNav}
                    </div>
                );
        }
    };

    return (
        <ThemeProvider theme={cmsTheme}>
            <BalanceProvider>
            {/* prism-cms-app: scoped ID for Moodle CSS isolation (Boost theme reset) */}
            <div
                id="prism-cms-app"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    background: 'var(--bg)',
                    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                }}
            >
                {/* Global Header */}
                <AppHeader activeNav={activeNav} />

                {/* Sidebar + Content */}
                <div style={{ display: 'flex', flex: 1 }}>
                    <Sidebar
                        activeNav={activeNav}
                        onNavChange={handleNavChange}
                        collapsed={collapsed}
                        onCollapse={handleToggleCollapse}
                        themeName={themeName}
                        setTheme={setThemeName}
                    />

                    {/* Scrollable content area */}
                    <main
                        id="arina_prism_sense-tour-cms-main"
                        style={{
                            flex: 1,
                            padding: '14px 22px',
                            overflow: 'auto',
                            minWidth: 0,
                        }}
                    >
                        {renderContent()}
                    </main>
                </div>
            </div>
            </BalanceProvider>
        </ThemeProvider>
    );
};
