import React from 'react';
import { Paper } from '@mui/material';
import { useContent } from '../../context/ContentContext';
import EmptyContentState from './EmptyContentState';
import SlideNavigationFooter from './SlideNavigationFooter';
import ContentViewerHeader from './ContentViewerHeader';
import ContentDisplayArea from './ContentDisplayArea';
import { useContentSlides } from './useContentSlides';

const ContentViewer: React.FC = () => {
    // Determine content type from context
    const { selectedContent, setSelectedContent, markAsComplete } = useContent();
    const isVideo = selectedContent?.type === 'video';

    const { slides, currentSlide, isLoading, error, handleNext, handlePrev, goToSlide } = useContentSlides(selectedContent, isVideo);

    if (!selectedContent) {
        return <EmptyContentState />;
    }

    // Construct Video URL if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const M = (window as any).M;
    const wwwroot = M?.cfg?.wwwroot || '';
    const courseId = M?.cfg?.courseId || (new URLSearchParams(window.location.search)).get('id') || 0;
    const videoUrl = `${wwwroot}/local/lecturebot/api/stream_video.php?courseid=${courseId}&contentid=${selectedContent.id}`;

    return (
        <Paper elevation={0} sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 1,
            bgcolor: 'white',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)'
        }}>
            <ContentViewerHeader
                selectedContent={selectedContent}
                onClose={() => setSelectedContent(null)}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onMarkAsComplete={markAsComplete}
            />

            <ContentDisplayArea
                isVideo={isVideo}
                videoUrl={videoUrl}
                title={selectedContent.title}
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

            {!isVideo && (
                <SlideNavigationFooter
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    slides={slides}
                    onSlideClick={goToSlide}
                />
            )}
        </Paper>
    );
};

export default ContentViewer;
