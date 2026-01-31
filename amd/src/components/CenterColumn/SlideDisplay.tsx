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
}

const SlideDisplay: React.FC<SlideDisplayProps> = ({
    generatedContent,
    currentContentItem,
    moodleContext,
    isApproved,
}) => {
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

    const currentTopic = generatedContent?.results?.[currentTopicIndex];
    const currentContentId = currentContentItem?.id;

    // Strip "Slides: " or "Video: " prefix from title
    const displayTitle = (currentContentItem?.title || currentContentItem?.sectionname || currentTopic?.topic || 'Untitled')
        .replace(/^(Slides|Video): /i, '');

    const renderSlideInfo = () => (
        <Box sx={{
            mb: 'clamp(8px, 1vw, 12px)',
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(8px, 1.5vw, 16px)',
        }}>
            <Typography
                variant="h6"
                sx={{ 
                    fontSize: 'clamp(1rem, 3.5vw, 1.35rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#0F6CBF',
                    lineHeight: 1.2
                }}
            >
                {displayTitle}
            </Typography>
            {
                isApproved && (
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
                            fontSize: 'clamp(0.7rem, 1.25vw, 0.75rem)',
                            height: 'clamp(24px, 2vw, 32px)',
                        }}
                    />
                )
            }
        </Box >
    );

    const renderTopicNavigation = () => {
        if (!generatedContent?.results || generatedContent.results.length <= 1) {
            return null;
        }

        return (
            <Box
                sx={{
                    mt: 'clamp(12px, 1.5vw, 16px)',
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    pb: 1, // Space for scrollbar
                    // Hide scrollbar on desktop
                    '&::-webkit-scrollbar': {
                        height: 4,
                        display: { xs: 'block', md: 'none' } // conditional display
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
                            minHeight: 'clamp(32px, 4vw, 36px)',
                            fontSize: 'clamp(0.75rem, 1.25vw, 0.8125rem)',
                        }}
                    >
                        Topic {idx + 1}
                    </Button>
                ))}
            </Box>
        );
    };

    return (
        <Box className="animate-scale-up" sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'start',
            minHeight: 0 
        }}>
            {currentTopic && renderSlideInfo()}

            <Box
                sx={{
                    width: '100%',
                    flex: '0 1 auto', // Size based on content, don't grow beyond it
                    minHeight: 0,
                    border: '2px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {currentContentId && moodleContext && (
                    <Box sx={{ 
                        flex: '0 1 auto', // Size based on content, don't grow beyond it
                        minHeight: 0, 
                        overflow: 'hidden',
                    }}>
                        <PptxViewer
                            contentId={currentContentId}
                            courseId={moodleContext.courseid}
                        />
                    </Box>
                )}
            </Box>

            {renderTopicNavigation()}
        </Box>
    );
};

export default SlideDisplay;
