import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/shared/Sidebar';
import { AppHeader } from '../components/shared/AppHeader';
import { THEMES, type ThemeName } from '../config/theme';

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
        <div
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
                    style={{
                        flex: 1,
                        padding: '14px 22px',
                        overflow: 'auto',
                    }}
                >
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};
