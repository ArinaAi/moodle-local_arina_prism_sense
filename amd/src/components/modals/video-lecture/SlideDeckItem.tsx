import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Radio,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { Play } from 'lucide-react';
import type { ContentItem } from '../../../types/app';

interface SlideDeckItemProps {
    slide: ContentItem;
    isSelected: boolean;
    sectionName: string;
    onSelect: (id: number) => void;
}

// Helper to format timestamp
const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

// Helper to count slides
const getSlideCount = (content: ContentItem): number => {
    if (!content.result || !content.result.results) {
        return 0;
    }
    return content.result.results.reduce((total, subtopic) => {
        return total + (subtopic.slideCount || 0);
    }, 0);
};

const SlideDeckItem: React.FC<SlideDeckItemProps> = ({
    slide,
    isSelected,
    sectionName,
    onSelect,
}) => {
    const slideCount = getSlideCount(slide);

    return (
        <Card
            onClick={() => onSelect(slide.id)}
            sx={{
                cursor: 'pointer',
                border: 'none',
                borderBottom: '1px solid #e9ecef',
                borderRadius: 0,
                bgcolor: isSelected ? 'rgba(15, 108, 191, 0.05)' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: isSelected ? 'rgba(15, 108, 191, 0.08)' : 'rgba(0,0,0,0.02)',
                },
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Icon */}
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            bgcolor: isSelected ? '#0f6cbf' : 'rgba(15, 108, 191, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {isSelected ? (
                            <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                        ) : (
                            <Play size={18} color="#0f6cbf" strokeWidth={2.5} />
                        )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                color: isSelected ? '#0f6cbf' : '#1a1a1a',
                                mb: 0.5,
                            }}
                        >
                            {slide.title?.replace(/^Slides: /, '') || sectionName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                                {formatTime(slide.timecreated)}
                            </Typography>
                            <Chip
                                label={`${slideCount} slide${slideCount !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    bgcolor: 'rgba(13, 92, 162, 0.08)',
                                    color: '#0D5CA2',
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Radio */}
                    <Radio
                        checked={isSelected}
                        value={slide.id}
                        sx={{
                            color: '#adb5bd',
                            '&.Mui-checked': { color: '#0f6cbf' },
                        }}
                    />
                </Box>
            </CardContent>
        </Card>
    );
};

export default SlideDeckItem;
