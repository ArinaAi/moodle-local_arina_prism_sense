import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Popover, Chip, IconButton } from '@mui/material';
import { Calendar, X } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { DateRangeFilterProps } from '../../types/dateRange';
import { useDatePresets } from '../../hooks/useDatePresets';

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClear,
    label = 'Date Range',
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [showCustom, setShowCustom] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);
    const presets = useDatePresets();

    const open = Boolean(anchorEl);

    const handleClick = () => {
        setAnchorEl(buttonRef.current);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setShowCustom(false);
    };

    const handlePresetClick = (getValue: () => { startDate: string; endDate: string }) => {
        const range = getValue();
        onStartDateChange(range.startDate);
        onEndDateChange(range.endDate);
        handleClose();
    };

    const handleClear = () => {
        onStartDateChange('');
        onEndDateChange('');
        onClear?.();
        handleClose();
    };

    const hasSelection = startDate || endDate;

    const getDisplayText = () => {
        if (!startDate && !endDate) {
            return label;
        }
        if (startDate && endDate) {
            return `${dayjs(startDate).format('MMM D, YYYY')} - ${dayjs(endDate).format('MMM D, YYYY')}`;
        }
        if (startDate) {
            return `From ${dayjs(startDate).format('MMM D, YYYY')}`;
        }
        return `Until ${dayjs(endDate).format('MMM D, YYYY')}`;
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div ref={buttonRef}>
                    <motion.div
                        onClick={handleClick}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            paddingRight: hasSelection ? '8px' : '12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--paper)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                            fontSize: '0.8125rem',
                            fontFamily: 'inherit',
                            color: 'var(--tp)',
                            minWidth: '200px',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#0f6cbf';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,108,191,0.12)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <Calendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ 
                            flex: 1, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: hasSelection ? 'var(--text-primary)' : 'var(--ts)',
                        }}>
                            {getDisplayText()}
                        </span>
                        {hasSelection && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                style={{ 
                                    padding: '4px',
                                    marginLeft: 'auto',
                                }}
                            >
                                <X size={14} />
                            </IconButton>
                        )}
                    </motion.div>
                </div>

                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    slotProps={{
                        paper: {
                            style: {
                                marginTop: '8px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                            },
                        },
                    }}
                >
                    <AnimatePresence mode="wait">
                        {!showCustom ? (
                            <motion.div
                                key="presets"
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                }}
                                style={{
                                    padding: '16px',
                                    minWidth: '280px',
                                }}
                            >
                                <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    color: 'var(--ts)', 
                                    marginBottom: '12px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Quick Select
                                </div>
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '6px',
                                }}>
                                    {presets.map((preset, index) => (
                                        <motion.div
                                            key={preset.label}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <Chip
                                                label={preset.label}
                                                onClick={() => handlePresetClick(preset.getValue)}
                                                sx={{
                                                    width: '100%',
                                                    justifyContent: 'flex-start',
                                                    padding: '12px 16px',
                                                    height: 'auto',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                        transform: 'translateX(4px)',
                                                    },
                                                }}
                                            />
                                        </motion.div>
                                    ))}
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: presets.length * 0.03 }}
                                        style={{ marginTop: '8px' }}
                                    >
                                        <Chip
                                            label="Custom Range..."
                                            onClick={() => setShowCustom(true)}
                                            variant="outlined"
                                            sx={{
                                                width: '100%',
                                                justifyContent: 'flex-start',
                                                padding: '12px 16px',
                                                height: 'auto',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                borderColor: 'var(--primary)',
                                                color: 'var(--primary)',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                                                    transform: 'translateX(4px)',
                                                },
                                            }}
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="custom"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                }}
                                style={{
                                    padding: '20px',
                                    minWidth: '320px',
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                }}>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        fontWeight: 600, 
                                        color: 'var(--ts)', 
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}>
                                        Custom Range
                                    </div>
                                    <IconButton
                                        size="small"
                                        onClick={() => setShowCustom(false)}
                                        style={{ padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </IconButton>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <DatePicker
                                        label="Start Date"
                                        value={startDate ? dayjs(startDate) : null}
                                        onChange={(newValue: Dayjs | null) => {
                                            onStartDateChange(newValue ? newValue.format('YYYY-MM-DD') : '');
                                        }}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                    <DatePicker
                                        label="End Date"
                                        value={endDate ? dayjs(endDate) : null}
                                        onChange={(newValue: Dayjs | null) => {
                                            onEndDateChange(newValue ? newValue.format('YYYY-MM-DD') : '');
                                        }}
                                        minDate={startDate ? dayjs(startDate) : undefined}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleClose}
                                        style={{
                                            padding: '10px 16px',
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            marginTop: '8px',
                                        }}
                                    >
                                        Apply
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Popover>
        </LocalizationProvider>
    );
};
