// ── Mock Data (centralized for easy future API swap) ─────────
import { Video, RefreshCw, Presentation, type LucideIcon } from 'lucide-react';

// Staff
export interface StaffMember {
    name: string;
    id: string;
    dept: string;
    balance: number;
    status: 'Active' | 'Ready';
}

export const MOCK_STAFF: StaffMember[] = [
    { name: 'Prof. Sarah Smith', id: 'EXT-1930', dept: 'Biology', balance: 450, status: 'Active' },
    { name: 'Dr. Ian Malcolm', id: 'EXT-2930', dept: 'Mathematics', balance: 50, status: 'Active' },
    { name: 'Nurse Joy', id: 'EXT-3930', dept: 'Care Center', balance: 1200, status: 'Active' },
    { name: 'Prof. Albus D.', id: 'EXT-4930', dept: 'Chemistry', balance: 2500, status: 'Active' },
    { name: 'Dr. John Watson', id: 'EXT-5930', dept: 'Forensics', balance: 0, status: 'Ready' },
];

// Ledger
export interface LedgerRow {
    ts: string;
    type: string;
    meta: string;
    amount: number;
    balance: number;
}

export const MOCK_LEDGER: LedgerRow[] = [
    { ts: 'Feb 15, 2026, 14:20', type: 'CONSUMPTION', meta: 'Prof. Sarah Smith: Prism Slide Gen - Job #A92', amount: -22, balance: 428 },
    { ts: 'Feb 15, 2026, 12:05', type: 'ALLOCATION', meta: 'Prof. Sarah Smith: Initial Distribution', amount: 500, balance: 450 },
    { ts: 'Feb 14, 2026, 09:30', type: 'PURCHASE', meta: 'Admin: Acquisition via NY2026_OFFER', amount: 5000, balance: 12972 },
    { ts: 'Feb 13, 2026, 16:45', type: 'RESERVATION', meta: 'Dr. Ian Malcolm: Video Gen (10s) - Pending', amount: -6, balance: 44 },
    { ts: 'Feb 12, 2026, 11:15', type: 'CONSUMPTION', meta: 'Nurse Joy: Care Sense Report Analysis', amount: -50, balance: 1150 },
    { ts: 'Feb 11, 2026, 14:00', type: 'ALLOCATION', meta: 'Nurse Joy: Initial Distribution', amount: 1200, balance: 1200 },
];

// Acquisitions
export interface AcquisitionRow {
    date: string;
    credits: string;
    paid: string;
    unit: string;
}

export const MOCK_ACQUISITIONS: AcquisitionRow[] = [
    { date: 'Feb 12, 2026', credits: '5,000', paid: '$400.00', unit: '$0.08/cr' },
    { date: 'Jan 28, 2026', credits: '10,000', paid: '$750.00', unit: '$0.075/cr' },
    { date: 'Jan 05, 2026', credits: '8,000', paid: '$600.00', unit: '$0.075/cr' },
];

// Staff history
export interface StaffHistoryRow {
    ts: string;
    type: string;
    desc: string;
    amount: number;
    balance: number;
}

export const MOCK_STAFF_HISTORY: StaffHistoryRow[] = [
    { ts: 'Feb 15, 2026, 14:20', type: 'CONSUMPTION', desc: 'Prism Slide Gen - Job #A92', amount: -22, balance: 428 },
    { ts: 'Feb 15, 2026, 12:05', type: 'ALLOCATION', desc: 'To: Prof. Sarah Smith', amount: 500, balance: 450 },
];

// Donut chart segments
export interface DonutSegment {
    name: string;
    value: number;
    color: string;
}

export const DONUT_DATA: DonutSegment[] = [
    { name: 'Slide Generation', value: 4800, color: '#4F46E5' },
    { name: 'Slide Regeneration', value: 2200, color: '#818CF8' },
    { name: 'Video Generation', value: 1650, color: '#20C997' },
];

// 7-day sparkline data (Mon → Sun)
export const SPARK = {
    balance: [11200, 10800, 11900, 11400, 12100, 11800, 12450],
    distributed: [2800, 3100, 3400, 3600, 3900, 4050, 4200],
    reserve: [8400, 7700, 8500, 7800, 8200, 7750, 8250],
};

// Pricing cards
export interface PricingCard {
    title: string;
    subtitle: string;
    accent: string;
    icon: LucideIcon;
    rows: Array<{ label: string; value: string }>;
    note: string;
}

export const PRICING_CARDS: PricingCard[] = [
    {
        title: 'Slide Generation',
        subtitle: 'Slides & Content Creation',
        accent: '#0f6cbf',
        icon: Presentation,
        rows: [{ label: 'Base Execution', value: '10 Cr' }, { label: 'Variable Rate', value: '0.2 / Page' }],
        note: 'Ideal for structured lecture decks and course modules.',
    },
    {
        title: 'Video Generation',
        subtitle: 'Multimedia Assets',
        accent: '#6F42C1',
        icon: Video,
        rows: [{ label: 'Charging Unit', value: '20 Seconds' }, { label: 'Credit Cost', value: '1.0 / Unit' }],
        note: 'Duration-based — only pay for what you generate.',
    },
    {
        title: 'Slide Regeneration',
        subtitle: 'Slides & content regeneration',
        accent: '#20C997',
        icon: RefreshCw,
        rows: [{ label: 'Basic Report', value: '50 Cr' }, { label: 'Specialist Scan', value: '120 Cr' }],
        note: 'Refresh existing content with new data or specialist scans.',
    },
];

// Nav page titles
export const NAV_TITLES: Record<string, string> = {
    overview: 'Overview',
    staff: 'Staff Management',
    financials: 'Financials',
    audit: 'Audit Ledger',
    pricing: 'Pricing Info',
};
