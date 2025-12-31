import { useEffect, Dispatch } from 'react';
import type { MoodleContext } from '../types/moodle';
import type { AppAction } from '../types/app';

export const useMoodleContext = (dispatch: Dispatch<AppAction>, showNotification: (msg: string, severity: 'error') => void) => {
    useEffect(() => {
        const getMoodleContext = (): MoodleContext => {
            const context = window.MOODLE_CONTEXT;
            if (!context) {
                throw new Error('Moodle context not found');
            }
            return context;
        };

        try {
            const context = getMoodleContext();
            dispatch({ type: 'SET_MOODLE_CONTEXT', payload: context });
        } catch (error) {
            console.error('Failed to get Moodle context:', error);
            showNotification('Failed to load Moodle context. Please refresh the page.', 'error');
        }
    }, [dispatch, showNotification]);
};
