import React from 'react';
import { Box, Typography, List, Card, CardContent, useTheme, Collapse } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import type { ContentItem } from '../../types/app';
import GeneratedContentItem from './GeneratedContentItem';
import { TransitionGroup } from 'react-transition-group';

interface PublishedContentListProps {
    contentItems: ContentItem[];
    onUnpublish: (contentId: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => void;
    isMobile?: boolean;
    onPreviewContent?: (contentId: number) => void;
}

const PublishedContentList: React.FC<PublishedContentListProps> = ({ 
    contentItems, 
    onUnpublish, 
    onMenuOpen, 
    isMobile = false,
    onPreviewContent 
}) => {
    const theme = useTheme();
    const publishedItems = contentItems.filter(item => item.status === 'published');

    const renderEmptyState = () => (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(40, 167, 69, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <CheckCircle sx={{ fontSize: 28, color: '#28a745' }} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>Nothing published yet</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Publish content to see it here</Typography>
        </Box>
    );

    return (
        <Card sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            minHeight: 0,
            overflow: 'hidden',
        }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: isMobile ? 1.5 : 2, pr: isMobile ? 0.5 : 1, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ pb: 'clamp(8px, 1vw, 16px)', borderBottom: `1px solid ${theme.palette.divider}`, mb: 'clamp(8px, 1vw, 16px)' }}>
                    <Typography variant="h6" component="h2" sx={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)', fontWeight: 600 }}>Published Content</Typography>
                </Box>

                {publishedItems.length === 0 ? renderEmptyState() : (
                    <List sx={{ flex: 1, overflow: 'auto', p: 0, pr: 1, scrollbarWidth: 'thin' }}>
                        <TransitionGroup component={null}>
                            {publishedItems.map(item => (
                                <Collapse key={item.id} timeout={400}>
                                    <GeneratedContentItem 
                                        item={item} 
                                        onPublish={() => {}} 
                                        onUnpublish={onUnpublish}
                                        onMenuOpen={onMenuOpen}
                                        onPreview={onPreviewContent}
                                    />
                                </Collapse>
                            ))}
                        </TransitionGroup>
                    </List>
                )}
            </CardContent>
        </Card>
    );
};

export default PublishedContentList;
