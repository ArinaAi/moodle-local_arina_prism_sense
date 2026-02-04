import React from 'react';
import { Box, Typography, List, CircularProgress, Card, CardContent, useTheme, Collapse } from '@mui/material';
import { FileText } from 'lucide-react';
import type { ContentItem } from '../../types/app';
import GeneratedContentItem from './GeneratedContentItem';
import { TransitionGroup } from 'react-transition-group';

interface GeneratedContentListProps {
    contentItems: ContentItem[];
    isLoading: boolean;
    onPublish: (contentId: string) => void;
    onUnpublish: (contentId: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => void;
    isMobile?: boolean;
    onPreviewContent?: (contentId: number) => void;
}

const GeneratedContentList: React.FC<GeneratedContentListProps> = ({
    contentItems,
    isLoading,
    onPublish,
    onUnpublish,
    onMenuOpen,
    isMobile = false,
    onPreviewContent,
}) => {
    const theme = useTheme();

    // Filter items - excluding published (they go in PublishedContentList)
    const generatingItems = contentItems.filter(item => item.status === 'generating');
    const readyItems = contentItems.filter(item => item.status === 'ready');
    const errorItems = contentItems.filter(item => item.status === 'error');

    const renderLoadingState = () => (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 6 }}>
            <CircularProgress size={40} thickness={4} sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading content...</Typography>
        </Box>
    );

    const renderEmptyState = () => (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(108, 117, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <FileText size={28} color="#6c757d" strokeWidth={2} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>No content yet</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Generate slides to see content here</Typography>
        </Box>
    );

    const renderList = () => {
        if (isLoading) {
            return renderLoadingState();
        }
        if (generatingItems.length === 0 && readyItems.length === 0 && errorItems.length === 0) {
            return renderEmptyState();
        }

        return (
            <List sx={{ flex: 1, overflow: 'auto', p: 0, pr: 1, scrollbarWidth: 'thin' }}>
                <TransitionGroup component={null}>
                    {generatingItems.map(item => (
                        <Collapse key={item.id} timeout={400}>
                            <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} />
                        </Collapse>
                    ))}
                    {readyItems.map(item => (
                        <Collapse key={item.id} timeout={400}>
                            <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} />
                        </Collapse>
                    ))}
                    {errorItems.map(item => (
                        <Collapse key={item.id} timeout={400}>
                            <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} />
                        </Collapse>
                    ))}
                </TransitionGroup>
            </List>
        );
    };

    return (
        <Card sx={{
            flex: 1.5,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            overflow: 'hidden',
        }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: isMobile ? 1.5 : 2, pr: isMobile ? 0.5 : 1, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ pb: 'clamp(8px, 1vw, 16px)', borderBottom: `1px solid ${theme.palette.divider}`, mb: 'clamp(8px, 1vw, 16px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="h2" sx={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)', fontWeight: 600 }}>Generated Content</Typography>
                </Box>
                {renderList()}
            </CardContent>
        </Card>
    );
};

export default GeneratedContentList;
