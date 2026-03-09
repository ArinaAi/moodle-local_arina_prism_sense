import { useState, useEffect, useRef, useCallback } from 'react';
import { BALANCE_REFRESH_EVENT } from '../lib/balanceEvents';

export interface BalanceData {
    current_balance: number;
    available_balance: number;
    reserved_credits: number;
}

export interface BalanceDelta {
    institutional: number; // current_balance diff
    available: number;     // computed available diff
    reserved: number;      // staffReserved diff
}

interface LiveBalanceResult {
    balanceData: BalanceData | null;
    staffReserved: number;
    delta: BalanceDelta | null; // null on first load
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

const POLL_INTERVAL_MS = 30_000;
const VISIBILITY_MIN_MS = 30_000; // min gap before re-fetching on focus

/**
 * Fetches org balance + staff reserved credits.
 * - Polls every 30s when `enabled` (i.e. Overview tab is active).
 * - Instant refresh on `creditBalanceChanged` custom event.
 * - Refresh on visibilitychange if >30s since last fetch.
 */
// Module-level: survives component unmount/remount so the delta is correctly
// computed even when the user navigates away (to Staff tab) and back.
let _prevBalance: number | null = null;
let _prevReserved: number | null = null;

export function useLiveBalance(enabled: boolean): LiveBalanceResult {
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
    const [staffReserved, setStaffReserved] = useState<number>(0);
    const [delta, setDelta] = useState<BalanceDelta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const lastFetchAt = useRef<number>(0);

    const fetchAll = useCallback(async () => {
        try {
            const baseUrl = ((globalThis as any).MOODLE_CMS_CONTEXT?.wwwroot) || '';
            const [balRes, reservedRes] = await Promise.all([
                fetch(`${baseUrl}/local/lecturebot/api/cms/get_balance.php`, { credentials: 'include' }),
                fetch(`${baseUrl}/local/lecturebot/api/cms/get_org_reserved.php`, { credentials: 'include' }),
            ]);

            const balResult = await balRes.json();
            const reservedResult = await reservedRes.json();

            if (balResult.success && balResult.data) {
                const newData: BalanceData = {
                    current_balance: balResult.data.current_balance || 0,
                    available_balance: balResult.data.available_balance || 0,
                    reserved_credits: balResult.data.reserved_credits || 0,
                };

                const newStaffReserved: number =
                    reservedResult.success && reservedResult.data
                        ? reservedResult.data.staff_reserved || 0
                        : 0;

                // Compute deltas vs previous (skip on very first app load)
                if (_prevBalance !== null) {
                    const newAvailable = Math.max(0, newData.current_balance - newStaffReserved);
                    const oldAvailable = Math.max(0, _prevBalance - (_prevReserved ?? newStaffReserved));

                    const d: BalanceDelta = {
                        institutional: newData.current_balance - _prevBalance,
                        available: newAvailable - oldAvailable,
                        reserved: newStaffReserved - (_prevReserved ?? newStaffReserved),
                    };

                    // Only publish delta if something actually changed
                    const hasChange = d.institutional !== 0 || d.available !== 0 || d.reserved !== 0;
                    if (hasChange) {
                        setDelta(d);
                        // Reset to null so next delta always transitions null → value
                        setTimeout(() => setDelta(null), 2000);
                    }
                }

                _prevBalance = newData.current_balance;
                _prevReserved = newStaffReserved;

                setBalanceData(newData);
                setStaffReserved(newStaffReserved);
                setError(null);
            } else {
                setError(balResult.message || 'Failed to fetch balance');
            }
        } catch (err) {
            console.error('useLiveBalance: fetch error', err);
            setError('Network error: Unable to load balance data');
        } finally {
            setLoading(false);
            lastFetchAt.current = Date.now();
        }
    }, []);

    // ── 1. Initial fetch ──────────────────────────────────────────────────────
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // ── 2. Polling (only when enabled) ───────────────────────────────────────
    useEffect(() => {
        if (!enabled) { return; }
        const id = setInterval(fetchAll, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [enabled, fetchAll]);

    // ── 3. Event-driven instant refresh ──────────────────────────────────────
    useEffect(() => {
        const handler = () => { void fetchAll(); };
        globalThis.addEventListener(BALANCE_REFRESH_EVENT, handler);
        return () => globalThis.removeEventListener(BALANCE_REFRESH_EVENT, handler);
    }, [fetchAll]);

    // ── 4. Page Visibility API — refresh on tab focus if stale ───────────────
    useEffect(() => {
        const handler = () => {
            if (document.visibilityState === 'visible') {
                const stale = Date.now() - lastFetchAt.current > VISIBILITY_MIN_MS;
                if (stale) { void fetchAll(); }
            }
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [fetchAll]);

    return { balanceData, staffReserved, delta, loading, error, refresh: () => { void fetchAll(); } };
}
