import React, { useState, useEffect } from 'react';
import SlideCarousel from './SlideCarousel';
import { Box, Typography, CircularProgress } from '@mui/material';

interface PptxViewerProps {
  contentId: number;
  courseId: number;
}

const PptxViewer: React.FC<PptxViewerProps> = ({ contentId, courseId }) => {
  const [usePdfFallback, setUsePdfFallback] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wwwroot = (window as any).M?.cfg?.wwwroot || '';
  const pdfUrl = `${wwwroot}/local/lecturebot/api/view_pptx_as_pdf.php?contentid=${contentId}`;

  // Check if carousel can load slides
  useEffect(() => {
    const checkSlides = async () => {
      try {
        const response = await fetch(
          `${wwwroot}/local/lecturebot/api/get_slide_images.php?contentid=${contentId}`
        );
        const data = await response.json();

        // If no slides or error, fall back to PDF
        if (data.status === 'error' || !data.images || data.images.length === 0) {
          setUsePdfFallback(true);
        }
      } catch (err) {
        setUsePdfFallback(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkSlides();
  }, [contentId, wwwroot]);

  if (isChecking) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a1a',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  if (usePdfFallback) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
        <Box sx={{ p: 2, bgcolor: 'rgba(255,165,0,0.1)', borderBottom: '1px solid rgba(255,165,0,0.3)' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,165,0,0.9)' }}>
            ℹ️ Carousel view unavailable. Showing PDF preview instead.
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            title="Presentation Preview"
          />
        </Box>
      </Box>
    );
  }

  return <SlideCarousel contentId={contentId} courseId={courseId} />;
};

export default PptxViewer;
