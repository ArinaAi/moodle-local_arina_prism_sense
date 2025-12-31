import React from 'react';
import { Box, Typography, ListItem, CircularProgress, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { Visibility, Add, MoreVert, Error as ErrorIcon } from '@mui/icons-material';
import { Play, Presentation } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { ContentItem } from '../../types/app';

interface GeneratedContentItemProps {
    item: ContentItem;
    onPreview: (contentId: number) => void;
    onPublish: (contentId: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => void;
}

const GeneratedContentItem: React.FC<GeneratedContentItemProps> = ({ item, onPreview, onPublish, onMenuOpen }) => {
    const theme = useTheme();

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

    // Render Logic for different statuses
    if (item.status === 'generating') {
        return (
            <ListItem
                sx={{
                    border: `1px solid ${theme.palette.warning.light}`,
                    borderRadius: '20px',
                    mb: 1.5,
                    p: 2,
                    backgroundColor: 'rgba(255, 193, 7, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 193, 7, 0.2), transparent)',
                        animation: 'shimmer 2s infinite',
                    },
                    '@keyframes shimmer': {
                        '0%': { left: '-100%' },
                        '100%': { left: '100%' },
                    },
                }}
            >
                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={28} thickness={4} sx={{ color: theme.palette.warning.main }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                        {item.sectionname}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusBadge status="generating" size="small" />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Started {formatDate(item.timecreated)}
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                        This may take a few moments. You&apos;ll be notified when ready.
                    </Typography>
                </Box>
            </ListItem>
        );
    }

    if (item.status === 'error') {
        return (
            <ListItem
                sx={{
                    border: `1px solid ${theme.palette.error.light}`,
                    borderRadius: '20px',
                    mb: 1.5,
                    p: 2,
                    backgroundColor: 'rgba(220, 53, 69, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ErrorIcon sx={{ fontSize: 28, color: theme.palette.error.main }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                        {item.sectionname}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusBadge status="error" size="small" />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.errormessage || 'Generation failed'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="More options" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
                        <IconButton
                            size="small"
                            onClick={(e) => onMenuOpen(e, item.id)}
                            sx={{
                                width: 32,
                                height: 32,
                                backgroundColor: 'grey.300',
                                color: 'grey.700',
                                '&:hover': { backgroundColor: 'grey.400' },
                            }}
                        >
                            <MoreVert fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </ListItem>
        );
    }

    // Ready Item
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
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: '0 6px 16px rgba(40, 167, 69, 0.2)',
                    borderColor: theme.palette.success.main
                },
            }}
            onClick={() => onPreview(item.id)}
        >
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.contenttype === 'video' ? (
                    <Play size={28} color="#28a745" strokeWidth={2.5} />
                ) : (
                    <Presentation size={28} color="#28a745" strokeWidth={2.5} />
                )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                    {item.sectionname}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={item.approved ? 'approved' : 'ready'} size="small" />
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
                        {item.approved ? 'Ready to publish' : 'Pending approval'} • {formatDate(item.timecreated)}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={item.contenttype === 'video' ? "Preview video" : "Preview slides"} arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.result) {
                                window.dispatchEvent(new CustomEvent('lecturebot:preview', { detail: { contentItem: item } }));
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
                <Tooltip title={item.approved ? "Publish to course page" : "Approve content first"} arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!item.approved}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPublish(`content-${item.id}`);
                            }}
                            sx={{
                                width: 32,
                                height: 32,
                                backgroundColor: item.approved ? 'success.main' : 'grey.300',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: item.approved ? 'success.dark' : 'grey.400',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: 'grey.300',
                                    color: 'grey.500',
                                },
                            }}
                        >
                            <Add fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="More options" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
                    <IconButton
                        size="small"
                        onClick={(e) => onMenuOpen(e, item.id)}
                        sx={{
                            width: 32,
                            height: 32,
                            backgroundColor: 'grey.300',
                            color: 'grey.700',
                            '&:hover': { backgroundColor: 'grey.400' },
                        }}
                    >
                        <MoreVert fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </ListItem>
    );
};

export default GeneratedContentItem;
