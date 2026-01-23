import React, { useMemo } from 'react';
import { Paper } from '@mui/material';
import ContentDisplayArea from '../../student/components/ContentViewer/ContentDisplayArea';
import SlideNavigationFooter from '../../student/components/ContentViewer/SlideNavigationFooter';
import { useContentSlides } from '../../student/components/ContentViewer/useContentSlides';

interface PptxViewerProps {
  contentId: number;
  courseId: number;
  title?: string;
}

const PptxViewer: React.FC<PptxViewerProps> = ({ contentId, courseId: _courseId, title = '' }) => {
  // Mock the selectedContent object expected by the hook
  const selectedContent = useMemo(() => ({ id: contentId }), [contentId]);

  // Reuse the hook from student components
  const { slides, currentSlide, isLoading, error, handleNext, handlePrev, goToSlide } = useContentSlides(selectedContent, false);

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0, // Reset since it's inside another container usually
        bgcolor: 'white',
        overflow: 'hidden',
      }}
    >
      <ContentDisplayArea
        isVideo={false}
        videoUrl=""
        title={title}
        isLoading={isLoading}
        error={error}
        currentSlideData={slides[currentSlide]}
        hasSlides={slides.length > 0}
        slides={slides}
        currentSlide={currentSlide}
        onNext={handleNext}
        onPrev={handlePrev}
        onSlideClick={goToSlide}
      />

      <SlideNavigationFooter
        currentSlide={currentSlide}
        totalSlides={slides.length}
        onNext={handleNext}
        onPrev={handlePrev}
        slides={slides}
        onSlideClick={goToSlide}
      />
    </Paper>
  );
};

export default PptxViewer;
