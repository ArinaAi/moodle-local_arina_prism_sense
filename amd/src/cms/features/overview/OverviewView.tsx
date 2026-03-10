import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, Zap, AlertCircle } from 'lucide-react';
import { Skeleton } from '@mui/material';
import { stagger } from '../../config/animations';
import { StatCard } from '../../components/ui/StatCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { BreakdownPanel } from '../../components/charts/BreakdownPanel';
import { useLiveBalance } from '../../hooks/useLiveBalance';

// Service Overview Card
const ServiceOverviewCard: React.FC = () => (
    <motion.div
        variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '16px 24px',
            boxShadow: 'var(--shadow)',
        }}
    >
        <div
            style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: '#0f6cbf',
                marginBottom: 10,
            }}
        >
            Institutional Overview
        </div>
        <p style={{ fontSize: '0.9375rem', color: 'var(--ts)', lineHeight: 1.7, margin: 0 }}>
            This dashboard provides a complete view of the institution&apos;s Prism credit activity.
            Monitor the credit pool, track faculty allocations, and review service usage across departments.
        </p>
    </motion.div>
);

// Overview Page
export const OverviewView: React.FC = () => {
    // useLiveBalance(true) → polling enabled because we are on the Overview tab
    const { balanceData, staffReserved, delta, loading, error } = useLiveBalance(true);

    // Usage metrics still fetched locally (not included in balance hook)
    const [usageData, setUsageData] = React.useState<any[]>([]);
    const [usageLoading, setUsageLoading] = React.useState(true);
    React.useEffect(() => {
        const baseUrl = (globalThis as any).MOODLE_CMS_CONTEXT?.wwwroot || '';
        fetch(`${baseUrl}/local/lecturebot/api/cms/get_usage_metrics.php`, { credentials: 'include' })
            .then((r) => r.json())
            .then((res) => { if (res.success && res.data) { setUsageData(res.data); } })
            .catch(() => {/* silently ignore */ })
            .finally(() => setUsageLoading(false));
    }, []);

    const isEmpty = !loading && !usageLoading && !error && balanceData && balanceData.current_balance === 0 && usageData.length === 0;

    const availableBalance = Math.max(0, (balanceData?.current_balance || 0) - staffReserved);
    const availablePct = balanceData && balanceData.current_balance > 0
        ? Math.floor((availableBalance / balanceData.current_balance) * 100)
        : 0;

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={stagger.cards}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
            <ServiceOverviewCard />

            {/* Error Banner */}
            {error && (
                <div style={{ padding: '12px 16px', background: '#ffebee', color: '#c62828', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={18} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{error}</span>
                </div>
            )}

            {/* Empty State Banner */}
            {isEmpty && (
                <motion.div
                    variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
                    style={{ padding: '16px 20px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0d47a1', fontWeight: 600 }}>
                        <Zap size={20} />
                        <span>Welcome to your Arina AI Credit Dashboard!</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0' }}>
                        Get started by purchasing a credit package to fuel your institution&apos;s AI generation.
                    </p>
                </motion.div>
            )}

            {/* Stat cards — 3 column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {loading ? (
                    <>
                        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: '20px' }} animation="wave" />
                        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: '20px' }} animation="wave" />
                        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: '20px' }} animation="wave" />
                    </>
                ) : (
                    <>
                        <StatCard
                            label="Institutional Balance"
                            value={balanceData?.current_balance || 0}
                            subtitle="Total credit pool"
                            color="#0f6cbf"
                            icon={DollarSign}
                            insight="Wallet active"
                            delta={delta?.institutional ?? null}
                        />
                        <StatCard
                            label="Available Reserve"
                            value={availableBalance}
                            subtitle="Institutional Balance minus reserved credits"
                            color="#6f42c1"
                            icon={Zap}
                            insight={`${availablePct}% of pool available`}
                            delta={delta?.available ?? null}
                        />
                        <StatCard
                            label="Reserved Credits"
                            value={staffReserved}
                            subtitle="Locked for pending operations"
                            color="#ff9800"
                            icon={Users}
                            insight="Currently processing"
                            delta={delta?.reserved ?? null}
                        />
                    </>
                )}
            </div>

            {/* Donut + Breakdown panel */}
            <motion.div
                variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
                style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '20px 28px',
                    boxShadow: 'var(--shadow)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.3fr',
                    gap: 32,
                    alignItems: 'center',
                    opacity: isEmpty ? 0.6 : 1,
                    filter: isEmpty ? 'grayscale(100%)' : 'none',
                    pointerEvents: isEmpty ? 'none' : 'auto'
                }}
            >
                {/* Left — donut */}
                <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--tp)', marginBottom: 2 }}>
                        Service Engagement
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--ts)', marginBottom: 4 }}>
                        Credit consumption by service type
                    </p>
                    {loading || usageLoading ? (
                        <Skeleton variant="circular" width={200} height={200} sx={{ margin: '0 auto', mt: 2 }} animation="wave" />
                    ) : (
                        <DonutChart data={isEmpty ? [{ name: 'No Data', value: 100, color: '#e0e0e0' }] : (usageData.length > 0 ? usageData : [{ name: 'No Usage Yet', value: 100, color: '#e0e0e0' }])} />
                    )}
                </div>

                {/* Right — breakdown */}
                {loading || usageLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2 }} animation="wave" />
                        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2 }} animation="wave" />
                        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2 }} animation="wave" />
                    </div>
                ) : (
                    <BreakdownPanel data={isEmpty ? [] : usageData} />
                )}
            </motion.div>
        </motion.div>
    );
};
