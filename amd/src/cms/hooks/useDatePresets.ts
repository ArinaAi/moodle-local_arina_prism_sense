import { useMemo } from 'react';
import dayjs from 'dayjs';
import { DatePreset, DateRange } from '../types/dateRange';

/**
 * Hook that provides common date range presets
 */
export const useDatePresets = (): DatePreset[] => {
    return useMemo(() => {
        const today = dayjs();
        
        return [
            {
                label: 'Today',
                getValue: (): DateRange => ({
                    startDate: today.format('YYYY-MM-DD'),
                    endDate: today.format('YYYY-MM-DD'),
                }),
            },
            {
                label: 'Last 7 days',
                getValue: (): DateRange => ({
                    startDate: today.subtract(7, 'day').format('YYYY-MM-DD'),
                    endDate: today.format('YYYY-MM-DD'),
                }),
            },
            {
                label: 'Last 30 days',
                getValue: (): DateRange => ({
                    startDate: today.subtract(30, 'day').format('YYYY-MM-DD'),
                    endDate: today.format('YYYY-MM-DD'),
                }),
            },
            {
                label: 'This Month',
                getValue: (): DateRange => ({
                    startDate: today.startOf('month').format('YYYY-MM-DD'),
                    endDate: today.format('YYYY-MM-DD'),
                }),
            },
            {
                label: 'Last Month',
                getValue: (): DateRange => {
                    const lastMonth = today.subtract(1, 'month');
                    return {
                        startDate: lastMonth.startOf('month').format('YYYY-MM-DD'),
                        endDate: lastMonth.endOf('month').format('YYYY-MM-DD'),
                    };
                },
            },
            {
                label: 'Last 3 Months',
                getValue: (): DateRange => ({
                    startDate: today.subtract(3, 'month').format('YYYY-MM-DD'),
                    endDate: today.format('YYYY-MM-DD'),
                }),
            },
        ];
    }, []);
};
