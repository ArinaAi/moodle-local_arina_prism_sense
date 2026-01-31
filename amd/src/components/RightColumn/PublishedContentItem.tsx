import React from 'react';
import { Box, Typography, ListItem, useTheme } from '@mui/material';
import StatusBadge from './StatusBadge';
import type { ContentItem } from '../../types/app';
import { useContentPreview } from '../../hooks/useContentPreview';
import { formatDate, ContentTypeIcon, ContentItemTitle, SlideCountChip } from './contentItemUtils';

interface PublishedContentItemProps {
    item: ContentItem;
}

const PublishedContentItem: React.FC<PublishedContentItemProps> = ({ item }) => {
    const theme = useTheme();
    const { handlePreviewContent } = useContentPreview({ contentItems: [item] });

    return (
        <ListItem
            sx={{
                border: `1px solid ${theme.palette.success.light}`,
                borderRadius: '20px',
                mb: 1.5,
                p: 'clamp(12px, 1.5vw, 16px)',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(8px, 1.5vw, 16px)',
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
                <ContentTypeIcon contentType={item.contenttype} color="#28a745" />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <ContentItemTitle title={item.sectionname} />
                <Box sx={{ display: 'flex', gap: 'clamp(4px, 1vw, 8px)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status="published" size="small" />
                    <SlideCountChip item={item} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 'clamp(0.7rem, 1.25vw, 0.75rem)' }}>
                        {item.timepublished ? formatDate(item.timepublished) : 'Published'}
                    </Typography>
                </Box>
            </Box>
        </ListItem>
    );
};

export default PublishedContentItem;
