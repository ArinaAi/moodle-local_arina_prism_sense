import React from 'react';
import { Box, Typography, List, ListItem, Skeleton, Card, CardContent, useTheme, Collapse } from '@mui/material';
import { FileText } from 'lucide-react';
import type { ContentItem } from '../../types/app';
import type { MoodleContext } from '../../types/moodle';
import GeneratedContentItem from './GeneratedContentItem';
import { TransitionGroup } from 'react-transition-group';
import { staggeredAnimation } from '../../styles/animations';

interface GeneratedContentListProps {
    contentItems: ContentItem[];
    isLoading: boolean;
    onPublish: (contentId: string) => void;
    onUnpublish: (contentId: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => void;
    isMobile?: boolean;
    onPreviewContent?: (contentId: number) => void;
    moodleContext: MoodleContext;
}

const GeneratedContentList: React.FC<GeneratedContentListProps> = ({
    contentItems,
    isLoading,
    onPublish,
    onUnpublish,
    onMenuOpen,
    isMobile = false,
    onPreviewContent,
    moodleContext,
}) => {
    const theme = useTheme();

    // Filter items - excluding published (they go in PublishedContentList)
    const generatingItems = contentItems.filter(item => item.status === 'generating');
    const readyItems = contentItems.filter(item => item.status === 'ready');
    const errorItems = contentItems.filter(item => item.status === 'error');

    const renderLoadingState = () => (
        <List sx={{ flex: 1, overflow: 'hidden', p: 0, pr: 1 }}>
            {[1, 2, 3].map(item => (
                <ListItem
                    key={item}
                    sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '20px',
                        mb: 1.5,
                        p: 'clamp(12px, 1.5vw, 16px)',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(8px, 1.5vw, 12px)',
                        opacity: 1 - (item * 0.2),
                    }}
                >
                    <Box sx={{ flexShrink: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Skeleton variant="circular" width={32} height={32} animation="wave" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Skeleton variant="text" width="70%" height={24} animation="wave" />
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Skeleton variant="rounded" width={60} height={20} animation="wave" sx={{ borderRadius: '12px' }} />
                            <Skeleton variant="rounded" width={45} height={20} animation="wave" sx={{ borderRadius: '12px' }} />
                            <Skeleton variant="text" width={80} height={18} animation="wave" />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 8px)', flexShrink: 0, alignItems: 'center' }}>
                        <Skeleton variant="circular" width={24} height={24} animation="wave" />
                        <Skeleton variant="circular" width={24} height={24} animation="wave" />
                    </Box>
                </ListItem>
            ))}
        </List>
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
                    {generatingItems.map((item, index) => (
                        <Collapse key={item.id} timeout={400}>
                            <Box sx={staggeredAnimation(index)}>
                                <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} moodleContext={moodleContext} />
                            </Box>
                        </Collapse>
                    ))}
                    {readyItems.map((item, index) => (
                        <Collapse key={item.id} timeout={400}>
                            <Box sx={staggeredAnimation(generatingItems.length + index, 0.05)}>
                                <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} moodleContext={moodleContext} />
                            </Box>
                        </Collapse>
                    ))}
                    {errorItems.map((item, index) => (
                        <Collapse key={item.id} timeout={400}>
                            <Box sx={staggeredAnimation(generatingItems.length + readyItems.length + index, 0.1)}>
                                <GeneratedContentItem item={item} onPublish={onPublish} onUnpublish={onUnpublish} onMenuOpen={onMenuOpen} onPreview={onPreviewContent} moodleContext={moodleContext} />
                            </Box>
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
