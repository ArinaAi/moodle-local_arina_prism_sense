import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import PptxViewer from './PptxViewer';
import type { GenerateLectureResponse, ContentItem } from '../../types/app';
import type { MoodleContext } from '../../types/moodle';

interface SlideDisplayProps {
    generatedContent: GenerateLectureResponse | null;
    currentContentItem?: ContentItem;
    moodleContext: MoodleContext | null;
    isApproved: boolean;
    isMobile?: boolean;
}

const SlideDisplay: React.FC<SlideDisplayProps> = ({
    generatedContent,
    currentContentItem,
    moodleContext,
    isApproved,
    isMobile = false,
}) => {
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

    const currentTopic = generatedContent?.results?.[currentTopicIndex];
    const totalSlides = currentTopic?.slideCount || currentTopic?.content?.length || 0;
    const currentContentId = currentContentItem?.id;

    const renderSlideInfo = () => (
        <Box sx={{
            mb: isMobile ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 1 : 2,
            flexWrap: 'wrap'
        }}>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            >
                {totalSlides} slide{totalSlides === 1 ? '' : 's'} generated for {currentTopic?.topic || 'this section'}
            </Typography>
            {isApproved && (
                <Chip
                    icon={<CheckCircle />}
                    label={currentContentItem?.approver
                        ? `Approved by ${currentContentItem.approver.fullname}`
                        : 'Approved'
                    }
                    color="success"
                    size="small"
                    sx={{
                        fontWeight: 600,
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                    }}
                />
            )}
        </Box>
    );

    const renderTopicNavigation = () => {
        if (!generatedContent?.results || generatedContent.results.length <= 1) {
            return null;
        }

        return (
            <Box
                sx={{
                    mt: isMobile ? 1.5 : 2,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    pb: 1, // Space for scrollbar
                    // Hide scrollbar on desktop, show on mobile
                    '&::-webkit-scrollbar': {
                        height: isMobile ? 4 : 0,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: 2,
                    },
                }}
            >
                {generatedContent.results.map((topic, idx) => (
                    <Button
                        key={topic.topic}
                        variant={idx === currentTopicIndex ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setCurrentTopicIndex(idx)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: idx === currentTopicIndex ? 600 : 400,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            minHeight: isMobile ? '36px' : '32px',
                            fontSize: isMobile ? '0.75rem' : '0.8125rem',
                        }}
                    >
                        Topic {idx + 1}
                    </Button>
                ))}
            </Box>
        );
    };

    return (
        <Box className="animate-scale-up" sx={{ width: '100%' }}>
            {currentTopic && renderSlideInfo()}

            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    // Use clamp for adaptive heights
                    minHeight: isMobile ? '200px' : 'clamp(350px, 45vh, 600px)',
                    maxHeight: isMobile ? '50vh' : 'clamp(500px, 65vh, 850px)',
                    border: '2px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
            >
                {currentContentId && moodleContext && (
                    <PptxViewer
                        contentId={currentContentId}
                        courseId={moodleContext.courseid}
                    />
                )}
            </Box>

            {renderTopicNavigation()}
        </Box>
    );
};

export default SlideDisplay;
