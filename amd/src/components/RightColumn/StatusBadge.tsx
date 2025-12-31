// components/shared/StatusBadge.tsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, CloudUpload, HourglassEmpty } from '@mui/icons-material';

interface StatusBadgeProps {
    status: 'generating' | 'ready' | 'error' | 'published' | 'queued' | 'approved';
    size?: 'small' | 'medium';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'generating':
                return {
                    label: 'Generating',
                    color: '#3498db',
                    bgColor: 'rgba(52, 152, 219, 0.1)',
                    icon: null,
                    ariaLabel: 'Content is currently being generated',
                };
            case 'ready':
                return {
                    label: 'Ready',
                    color: '#2ecc71',
                    bgColor: 'rgba(46, 204, 113, 0.1)',
                    icon: <CheckCircle sx={{ fontSize: 16, color: '#2ecc71' }} />,
                    ariaLabel: 'Content is ready for review',
                };
            case 'error':
                return {
                    label: 'Error',
                    color: '#e74c3c',
                    bgColor: 'rgba(231, 76, 60, 0.1)',
                    icon: <ErrorIcon sx={{ fontSize: 16, color: '#e74c3c' }} />,
                    ariaLabel: 'Content generation failed',
                };
            case 'published':
                return {
                    label: 'Published',
                    color: '#9b59b6',
                    bgColor: 'rgba(155, 89, 182, 0.1)',
                    icon: <CloudUpload sx={{ fontSize: 16, color: '#9b59b6' }} />,
                    ariaLabel: 'Content has been published to course',
                };
            case 'queued':
                return {
                    label: 'Queued',
                    color: '#95a5a6',
                    bgColor: 'rgba(149, 165, 166, 0.1)',
                    icon: <HourglassEmpty sx={{ fontSize: 16, color: '#95a5a6' }} />,
                    ariaLabel: 'Content is queued for generation',
                };
            case 'approved':
                return {
                    label: 'Approved',
                    color: '#27ae60',
                    bgColor: 'rgba(39, 174, 96, 0.1)',
                    icon: <CheckCircle sx={{ fontSize: 16, color: '#27ae60' }} />,
                    ariaLabel: 'Content is approved',
                };
            default:
                return {
                    label: status,
                    color: '#6c757d',
                    bgColor: 'rgba(108, 117, 125, 0.1)',
                    icon: null,
                    ariaLabel: `Status: ${status}`,
                };
        }
    };

    const config = getStatusConfig();

    return (
        <Chip
            icon={
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 0.5,
                    }}
                >
                    {config.icon}
                </Box>
            }
            label={config.label}
            size={size}
            aria-label={config.ariaLabel}
            sx={{
                backgroundColor: config.bgColor,
                color: config.color,
                fontWeight: 600,
                fontSize: size === 'small' ? '0.75rem' : '0.875rem',
                border: `1px solid ${config.color}`,
                '& .MuiChip-icon': {
                    marginLeft: '8px',
                    marginRight: '-4px',
                },
            }}
        />
    );
};

export default StatusBadge;
