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
    isMobile?: boolean; // Prop drilled if needed for styling
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
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
                {totalSlides} slide{totalSlides !== 1 ? 's' : ''} generated for {currentTopic?.topic || 'this section'}
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
                    sx={{ fontWeight: 600 }}
                />
            )}
        </Box>
    );

    const renderTopicNavigation = () => {
        if (!generatedContent || !generatedContent.results || generatedContent.results.length <= 1) {
            return null;
        }

        return (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {generatedContent.results.map((topic, idx) => (
                    <Button
                        key={topic.topic}
                        variant={idx === currentTopicIndex ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setCurrentTopicIndex(idx)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: idx === currentTopicIndex ? 600 : 400,
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
                    minHeight: isMobile ? '250px' : '600px',
                    maxHeight: isMobile ? '50vh' : '850px',
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
