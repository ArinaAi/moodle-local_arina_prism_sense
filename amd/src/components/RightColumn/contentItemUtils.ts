// Shared utility functions and components for content items

import React from 'react';
import { Box, Typography, Tooltip, IconButton, Chip } from '@mui/material';
import { Play, Presentation } from 'lucide-react';
import type { ContentItem } from '../../types/app';
import StatusBadge from './StatusBadge';

/**
 * Formats a Unix timestamp to a readable date string
 */
export const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    };
    return date.toLocaleString('en-US', options);
};

/**
 * Calculates the total slide count from content item results
 */
export const getSlideCount = (item: ContentItem): number => {
    if (!item.result || !item.result.results) {
        return 0;
    }
    return item.result.results.reduce((total: number, subtopic: any) => {
        return total + (subtopic.slideCount || 0);
    }, 0);
};

/**
 * Renders the appropriate icon for content type
 */
export const ContentTypeIcon: React.FC<{ 
    contentType: string; 
    color: string; 
    size?: number;
}> = ({ contentType, color, size = 28 }) => {
    const iconStyle = { 
        width: `clamp(${size - 4}px, 3vw, ${size}px)`, 
        height: `clamp(${size - 4}px, 3vw, ${size}px)` 
    };
    
    return contentType === 'video' ? (
        <Play size={size} style={iconStyle} color={color} strokeWidth={2.5} />
    ) : (
        <Presentation size={size} style={iconStyle} color={color} strokeWidth={2.5} />
    );
};

/**
 * Shared component for content item title with tooltip
 */
export const ContentItemTitle: React.FC<{ title: string }> = ({ title }) => (
    <Tooltip title={title} arrow placement="top" enterDelay={300} enterTouchDelay={500} leaveTouchDelay={1500} PopperProps={{ sx: { zIndex: 100006 } }}>
        <Typography
            variant="body2"
            sx={{
                fontWeight: 600,
                color: 'text.primary',
                mb: 0.5,
                fontSize: 'clamp(0.8125rem, 1.25vw, 0.875rem)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            {title}
        </Typography>
    </Tooltip>
);

/**
 * Shared component for slide count chip
 */
export const SlideCountChip: React.FC<{ item: ContentItem }> = ({ item }) => {
    if (item.contenttype === 'video') return null;
    
    return (
        <Chip
            label={`${getSlideCount(item)} slides`}
            size="small"
            sx={{
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                color: '#28a745',
                fontWeight: 500,
                fontSize: 'clamp(0.65rem, 1vw, 0.7rem)',
                height: 'clamp(18px, 2vw, 20px)',
            }}
        />
    );
};
