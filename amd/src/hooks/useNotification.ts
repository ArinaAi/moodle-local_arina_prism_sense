import { useState, useCallback } from 'react';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface NotificationState {
    message: string;
    severity: NotificationSeverity;
    open: boolean;
}

export const useNotification = () => {
    const [notification, setNotification] = useState<NotificationState>({
        message: '',
        severity: 'info',
        open: false,
    });

    const showNotification = useCallback((message: string, severity: NotificationSeverity) => {
        setNotification({ message, severity, open: true });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification((prev) => ({ ...prev, open: false }));
    }, []);

    return {
        notification,
        showNotification,
        closeNotification,
    };
};
