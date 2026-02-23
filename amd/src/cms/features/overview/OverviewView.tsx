import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, Zap } from 'lucide-react';
import { stagger } from '../../config/animations';
import { DONUT_DATA } from '../../config/mockData';
import { StatCard } from '../../components/ui/StatCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { BreakdownPanel } from '../../components/charts/BreakdownPanel';

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
export const OverviewView: React.FC = () => (
    <motion.div
        initial="initial"
        animate="animate"
        variants={stagger.cards}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
        <ServiceOverviewCard />

        {/* Stat cards — 3 column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <StatCard
                label="Institutional Balance"
                value={12450}
                subtitle="Total credit pool"
                color="#0f6cbf"
                icon={DollarSign}
                insight="Last top-up: Feb 12, 2026"
            />
            <StatCard
                label="Faculty Distribution"
                value={4200}
                subtitle="Allocated across staff"
                color="#28a745"
                icon={Users}
                insight="5 staff members onboarded"
            />
            <StatCard
                label="Available Reserve"
                value={8250}
                subtitle="Unallocated & ready to use"
                color="#6f42c1"
                icon={Zap}
                insight="66% of pool still available"
            />
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
                <DonutChart data={DONUT_DATA} />
            </div>

            {/* Right — breakdown */}
            <BreakdownPanel data={DONUT_DATA} />
        </motion.div>
    </motion.div>
);
