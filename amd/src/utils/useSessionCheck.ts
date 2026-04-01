/**
 * useSessionCheck
 *
 * Fires a lightweight ping to verify the Moodle session is still alive.
 * If the session has expired, apiFetch detects it and redirects to login.
 *
 * Usage — call checkSession() at the point where you want to gate access,
 * e.g. when a modal opens:
 *
 *   const { checkSession } = useSessionCheck(moodleContext);
 *
 *   useEffect(() => {
 *     if (open) { checkSession(); }
 *   }, [open]);
 */

import { useCallback } from 'react';
import { apiFetch, SessionExpiredError } from './apiFetch';

interface SessionCheckContext {
    wwwroot: string;
}

interface UseSessionCheckResult {
    /** Fire-and-forget session ping. Redirects to login if session is expired. */
    checkSession: () => void;
}

export function useSessionCheck(context: SessionCheckContext | null): UseSessionCheckResult {
    const checkSession = useCallback(() => {
        if (!context?.wwwroot) {
            return;
        }

        apiFetch(
            `${context.wwwroot}/local/lecturebot/api/ping.php`,
            { method: 'GET', credentials: 'include' }
        ).catch((err) => {
            // SessionExpiredError is already handled inside apiFetch (redirect fired).
            // Any other network error is silently ignored — we don't want to
            // block the modal from opening due to a transient network blip.
            if (!(err instanceof SessionExpiredError)) {
                console.warn('Session check failed (non-auth):', err);
            }
        });
    }, [context]);

    return { checkSession };
}
