import React from 'react';

// ── Badge Types ──────────────────────────────────────────────
export type BadgeType =
    | 'Active'
    | 'Ready'
    | 'CONSUMPTION'
    | 'ALLOCATION'
    | 'ALLOCATION_OUT'
    | 'ALLOCATION_IN'
    | 'PURCHASE'
    | 'RESERVATION'
    | 'REFUND'
    | 'ADMIN_ADJUSTMENT'
    | 'MANUAL_ADJUSTMENT'
    | 'EXPIRATION';

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
    Active: { bg: 'rgba(40,167,69,0.15)', color: '#155724' },
    Ready: { bg: 'rgba(108,117,125,0.12)', color: '#6c757d' },
    CONSUMPTION: { bg: 'rgba(253,126,20,0.12)', color: '#7d3c00' },
    ALLOCATION: { bg: 'rgba(15,108,191,0.10)', color: '#0a3d6b' },
    ALLOCATION_OUT: { bg: 'rgba(15,108,191,0.10)', color: '#0a3d6b' },
    ALLOCATION_IN: { bg: 'rgba(0,150,136,0.10)', color: '#00695c' },
    PURCHASE: { bg: 'rgba(40,167,69,0.10)', color: '#155724' },
    RESERVATION: { bg: 'rgba(111,66,193,0.10)', color: '#4a235a' },
    REFUND: { bg: 'rgba(255,193,7,0.12)', color: '#856404' },
    ADMIN_ADJUSTMENT: { bg: 'rgba(108,117,125,0.10)', color: '#495057' },
    MANUAL_ADJUSTMENT: { bg: 'rgba(108,117,125,0.10)', color: '#495057' },
    EXPIRATION: { bg: 'rgba(220,53,69,0.10)', color: '#721c24' },
};

interface BadgeProps {
    type: BadgeType | string;
    label?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, label }) => {
    const style = BADGE_COLORS[type] || { bg: '#f0f0f0', color: '#6c757d' };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.color,
                whiteSpace: 'nowrap',
            }}
        >
            {label || type}
        </span>
    );
};
