import React from 'react';
import { Box, Typography, ListItem, CircularProgress, IconButton, Tooltip, useTheme } from '@mui/material';
import { Add, Close, MoreVert, Error as ErrorIcon } from '@mui/icons-material';
import StatusBadge from './StatusBadge';
import type { ContentItem } from '../../types/app';
import { useContentPreview } from '../../hooks/useContentPreview';
import { ContentTypeIcon, ContentItemTitle, SlideCountChip, formatDate } from './contentItemUtils';

interface GeneratedContentItemProps {
    item: ContentItem;
    onPublish: (contentId: string) => void;
    onUnpublish: (contentId: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => void;
    onPreview?: (contentId: number) => void;
}

const TOOLTIP_CONFIG = {
  arrow: true,
  placement: "top" as const,
  enterDelay: 800, // Increased from 500
  enterTouchDelay: 800, // Increased from 500
  leaveTouchDelay: 2000, // Keep or adjust
  PopperProps: { sx: { zIndex: 100006 } }
};

const GeneratedContentItem: React.FC<GeneratedContentItemProps> = ({ item, onPublish, onUnpublish, onMenuOpen, onPreview }) => {
    const theme = useTheme();
    const { handlePreviewContent: localHandlePreview } = useContentPreview({ contentItems: [item] });

    const handlePreview = (id: number) => {
        if (onPreview) {
            onPreview(id);
        } else {
            localHandlePreview(id);
        }
    };

    const isPublished = item.status === 'published';

    // Render Logic for different statuses
    if (item.status === 'generating') {
        return (
            <ListItem
                sx={{
                    border: `1px solid ${theme.palette.warning.light}`,
                    borderRadius: '16px',
                    mb: 1.5,
                    p: 1.5,
                    backgroundColor: 'rgba(255, 193, 7, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 193, 7, 0.15), transparent)',
                        animation: 'shimmer 2.5s infinite',
                    },
                    '@keyframes shimmer': {
                        '0%': { left: '-100%' },
                        '100%': { left: '100%' },
                    },
                }}
            >
                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={22} thickness={4} sx={{ color: theme.palette.warning.main }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Tooltip title={item.sectionname} {...TOOLTIP_CONFIG}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.sectionname}
                        </Typography>
                    </Tooltip>
                    <StatusBadge status="generating" size="small" />
                </Box>
            </ListItem>
        );
    }

    if (item.status === 'error') {
        return (
            <ListItem
                sx={{
                    border: `1px solid ${theme.palette.error.light}`,
                    borderRadius: 'clamp(12px, 3vw, 20px)',
                    mb: 'clamp(8px, 1.5vh, 12px)',
                    p: 'clamp(10px, 2vw, 16px)',
                    backgroundColor: 'rgba(220, 53, 69, 0.05)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'clamp(8px, 2vw, 16px)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ErrorIcon sx={{ fontSize: 'clamp(20px, 3vw, 28px)', color: theme.palette.error.main }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Tooltip title={item.sectionname} {...TOOLTIP_CONFIG}>
                        <Typography variant="body2" sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            mb: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {item.sectionname}
                        </Typography>
                    </Tooltip>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <StatusBadge status="error" size="small" />
                    </Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            mt: 0.5,
                            wordBreak: 'break-word',
                            overflow: 'hidden',
                            // Limit to 3 lines with ellipsis
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
                        }}
                    >
                        {item.errormessage || 'Generation failed'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="More options" {...TOOLTIP_CONFIG}>
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
                border: isPublished 
                    ? `1px solid ${theme.palette.success.light}`
                    : `1px solid ${theme.palette.success.light}`,
                borderRadius: '20px',
                mb: 1.5,
                p: 'clamp(12px, 1.5vw, 16px)',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(8px, 1.5vw, 12px)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: isPublished ? 0 : '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(40, 167, 69, 0.08), transparent)',
                    transition: 'left 0.5s ease',
                    pointerEvents: 'none',
                },
                '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: isPublished 
                        ? '0 6px 16px rgba(40, 167, 69, 0.25)'
                        : '0 6px 16px rgba(40, 167, 69, 0.2)',
                    borderColor: theme.palette.success.main,
                    '&::before': {
                        left: isPublished ? '100%' : 0,
                    },
                },
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (item.result) {
                    handlePreview(item.id);
                } else {
                    // eslint-disable-next-line no-console
                    console.warn('⚠️ No result found for content item:', item);
                }
            }}
        >
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ContentTypeIcon contentType={item.contenttype} color="#28a745" />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 12px)'}}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ContentItemTitle title={item.sectionname} />
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 'clamp(4px, 1vw, 8px)', 
                        alignItems: 'center', 
                        flexWrap: 'wrap',
                        transition: 'all 0.3s ease',
                    }}>
                        <Box sx={{ 
                            transition: 'all 0.3s ease',
                            animation: isPublished ? 'fadeIn 0.5s ease' : 'none',
                            '@keyframes fadeIn': {
                                '0%': { opacity: 0, transform: 'scale(0.8)' },
                                '100%': { opacity: 1, transform: 'scale(1)' },
                            },
                        }}>
                            <StatusBadge status={isPublished ? 'published' : (item.approved ? 'approved' : 'ready')} size="small" />
                        </Box>
                        <SlideCountChip item={item} />
                        <Typography variant="caption" sx={{ 
                            color: 'text.secondary', 
                            fontSize: 'clamp(0.7rem, 1.25vw, 0.75rem)',
                            transition: 'color 0.3s ease',
                        }}>
                            {isPublished 
                                ? (item.timepublished ? formatDate(item.timepublished) : 'Published')
                                : (item.approved ? 'Ready to publish' : 'Pending approval')
                            }
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 8px)', flexShrink: 0, alignItems: 'center' }}>
                    {item.approved && (
                        <Tooltip 
                            title={isPublished ? "Unpublish content" : "Publish to course page"} 
                            {...TOOLTIP_CONFIG}
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPublished) {
                                        onUnpublish(`content-${item.id}`);
                                    } else {
                                        onPublish(`content-${item.id}`);
                                    }
                                }}
                                sx={{
                                    width: 'clamp(20px, 3vw, 24px)',
                                    height: 'clamp(20px, 3vw, 24px)',
                                    backgroundColor: isPublished ? 'error.main' : 'success.main',
                                    color: 'white',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: 'scale(1)',
                                    '&:hover': {
                                        backgroundColor: isPublished ? 'error.dark' : 'success.dark',
                                        transform: 'scale(1.1)',
                                        boxShadow: isPublished 
                                            ? '0 4px 12px rgba(220, 53, 69, 0.4)'
                                            : '0 4px 12px rgba(40, 167, 69, 0.4)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: isPublished ? 'rotate(90deg)' : 'rotate(0deg)',
                                    }}
                                >
                                    {isPublished ? (
                                        <Close fontSize="small" sx={{ 
                                            fontSize: 'clamp(14px, 2vw, 16px)',
                                            transition: 'opacity 0.2s ease',
                                        }} />
                                    ) : (
                                        <Add fontSize="small" sx={{ 
                                            fontSize: 'clamp(14px, 2vw, 16px)',
                                            transition: 'opacity 0.2s ease',
                                        }} />
                                    )}
                                </Box>
                            </IconButton>
                        </Tooltip>
                    )}
                    
                    <Tooltip title="More options" {...TOOLTIP_CONFIG}>
                        <IconButton
                            size="small"
                            onClick={(e) => onMenuOpen(e, item.id)}
                            sx={{
                                width: 'clamp(20px, 3vw, 24px)',
                                height: 'clamp(20px, 3vw, 24px)',
                                backgroundColor: 'grey.300',
                                color: 'grey.700',
                                '&:hover': { backgroundColor: 'grey.400' },
                            }}
                        >
                            <MoreVert fontSize="small" sx={{ fontSize: 'clamp(14px, 2vw, 16px)' }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </ListItem>
    );
};

export default GeneratedContentItem;
