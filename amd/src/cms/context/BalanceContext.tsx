import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiveBalance, type LiveBalanceResult } from '../hooks/useLiveBalance';
import { apiFetch } from '../../utils/apiFetch';

export interface UsageDataItem {
    name: string;
    value: number;
    color: string;
}

export interface BalanceContextValue extends LiveBalanceResult {
    usageData: UsageDataItem[];
    usageLoading: boolean;
    refreshAll: () => void;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const liveBalance = useLiveBalance();

    const [usageData, setUsageData] = useState<UsageDataItem[]>([]);
    const [usageLoading, setUsageLoading] = useState(true);

    const fetchUsage = useCallback(() => {
        setUsageLoading(true);
        const baseUrl = window.MOODLE_CMS_CONTEXT?.wwwroot || '';
        apiFetch(`${baseUrl}/local/arina_prism_sense/api/cms/get_usage_metrics.php`, { credentials: 'include' })
            .then((r) => r.json())
            .then((res) => { if (res.success && res.data) { setUsageData(res.data); } })
            .catch(() => { /* silently ignore */ })
            .finally(() => setUsageLoading(false));
    }, []);

    useEffect(() => { fetchUsage(); }, [fetchUsage]);

    const refreshAll = useCallback(() => {
        liveBalance.refresh();
        fetchUsage();
    // liveBalance.refresh is recreated each render but calls the stable internal fetchAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchUsage]);

    const value: BalanceContextValue = {
        ...liveBalance,
        usageData,
        usageLoading,
        refreshAll,
    };

    return (
        <BalanceContext.Provider value={value}>
            {children}
        </BalanceContext.Provider>
    );
};

export const useBalanceContext = (): BalanceContextValue => {
    const ctx = useContext(BalanceContext);
    if (!ctx) {
        throw new Error('useBalanceContext must be used within a BalanceProvider');
    }
    return ctx;
};
