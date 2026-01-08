import React from 'react';
import { Box, Typography, ListItem, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { Presentation, Play } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { ContentItem } from '../../types/app';
import { useContentPreview } from '../../hooks/useContentPreview';

interface PublishedContentItemProps {
    item: ContentItem;
}

const PublishedContentItem: React.FC<PublishedContentItemProps> = ({ item }) => {
    const theme = useTheme();
    const { handlePreviewContent } = useContentPreview({ contentItems: [item] });

    const formatDate = (timestamp: number) => {
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

    const getSlideCount = (item: ContentItem): number => {
        if (!item.result || !item.result.results) { return 0 };
        return item.result.results.reduce((total: number, subtopic: any) => {
            return total + (subtopic.slideCount || 0);
        }, 0);
    };

    return (
        <ListItem
            sx={{
                border: `1px solid ${theme.palette.success.light}`,
                borderRadius: '20px',
                mb: 1.5,
                p: 2,
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: '0 6px 16px rgba(40, 167, 69, 0.2)',
                    borderColor: theme.palette.success.main,
                },
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (item.result) {
                    handlePreviewContent(item.id);
                }
            }}
        >
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.contenttype === 'video' ? (
                    <Play size={28} color="#28a745" strokeWidth={2.5} />
                ) : (
                    <Presentation size={28} color="#28a745" strokeWidth={2.5} />
                )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {item.sectionname}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status="published" size="small" />
                    {item.contenttype !== 'video' && (
                        <Chip
                            label={`${getSlideCount(item)} slides`}
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                color: '#28a745',
                                fontWeight: 500,
                                fontSize: '0.7rem',
                                height: '20px',
                            }}
                        />
                    )}
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {item.timepublished ? formatDate(item.timepublished) : 'Published'}
                    </Typography>
                </Box>
            </Box>

            <Tooltip title={item.contenttype === 'video' ? "Preview video" : "Preview slides"} arrow placement="top" PopperProps={{ sx: { zIndex: 100006 } }}>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.result) {
                            handlePreviewContent(item.id);
                        }
                    }}
                    sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: 'info.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'info.dark' },
                    }}
                >
                    <Visibility fontSize="small" />
                </IconButton>
            </Tooltip>
        </ListItem>
    );
};

export default PublishedContentItem;
