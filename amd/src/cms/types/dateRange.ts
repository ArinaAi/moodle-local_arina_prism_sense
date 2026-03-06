/**
 * Date range types for date filter components
 */

export interface DateRange {
    startDate: string; // YYYY-MM-DD format
    endDate: string;   // YYYY-MM-DD format
}

export interface DatePreset {
    label: string;
    icon?: string;
    getValue: () => DateRange;
}

export interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onClear?: () => void;
    minDate?: string;
    maxDate?: string;
    label?: string;
}
