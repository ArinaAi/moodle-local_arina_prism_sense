import { useState, useEffect, useCallback } from 'react';
import type { MoodleContext } from '../types/moodle';

interface CreditBalanceState {
    /** Credits available for use (current - reserved) */
    availableBalance: number;
    /** Whether a wallet actually exists for this teacher */
    hasWallet: boolean;
    /** True while the initial fetch is in flight */
    loading: boolean;
    /** Trigger a re-fetch (e.g. after generation completes) */
    refresh: () => void;
}

export const useCreditBalance = (moodleContext: MoodleContext | null): CreditBalanceState => {
    const [availableBalance, setAvailableBalance] = useState(0);
    const [hasWallet, setHasWallet] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchBalance = useCallback(async () => {
        if (!moodleContext) {
            return;
        }

        try {
            const res = await fetch(
                `${moodleContext.wwwroot}/local/lecturebot/api/get_teacher_balance.php`,
                { method: 'GET', credentials: 'include' }
            );
            const json = await res.json();

            if (json.success && json.data) {
                setAvailableBalance(json.data.available_balance);
                setHasWallet(json.data.has_wallet);
            }
        } catch (err) {
            console.error('Failed to fetch credit balance:', err);
        } finally {
            setLoading(false);
        }
    }, [moodleContext]);

    // Fetch on mount
    useEffect(() => {
        if (moodleContext) {
            void fetchBalance();
        }
    }, [moodleContext, fetchBalance]);

    return { availableBalance, hasWallet, loading, refresh: fetchBalance };
};
