// components/Modals/PDFPreviewModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  ButtonGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (params: { scale: number }) => PDFViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D | null; viewport: PDFViewport }) => { promise: Promise<void> };
}

interface PDFViewport {
  height: number;
  width: number;
}

interface PDFPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  author?: string;
  filesize?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  } else if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
};

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  open,
  onClose,
  pdfUrl,
  title,
  author,
  filesize,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const boxStyles = getModalBoxStyles(isMobile, { sm: '95%', md: '90%', lg: '1200px' }, '90vh');
  const layoutStyles = getModalLayoutStyles(isMobile);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);

  // Load PDF when modal opens
  const loadPDF = React.useCallback(async () => {
    if (!pdfUrl) {
      console.error('No PDF URL provided');
      setError('No PDF URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf as unknown as PDFDocument);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setLoading(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF. The file may be corrupt or unavailable.');
      setLoading(false);
    }
  }, [pdfUrl]);

  // Load PDF when modal opens
  useEffect(() => {
    if (!open) {
      return;
    }

    loadPDF();
  }, [open, pdfUrl, loadPDF]);

  // Render current page
  const renderPage = React.useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) {
      return;
    }

    renderingRef.current = true;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    } finally {
      renderingRef.current = false;
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    renderPage(currentPage);
  }, [pdfDoc, currentPage, scale, renderPage]);

  const handlePrevPage = React.useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const handleNextPage = React.useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!open) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      handlePrevPage();
    } else if (e.key === 'ArrowRight') {
      handleNextPage();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [open, handlePrevPage, handleNextPage, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPdfDoc(null);
      setCurrentPage(1);
      setTotalPages(0);
      setScale(1.0);
      setLoading(true);
      setError(null);
      renderingRef.current = false;
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100001,
      }}
    >
      <Box
        sx={{
          ...boxStyles,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: layoutStyles.padding,
            borderBottom: '1px solid #e9ecef',
            flexShrink: 0,
            bgcolor: '#fafbfc',
          }}
        >
          <Box sx={{ flex: 1, pr: 2, minWidth: 0 }}>
            <Typography
              variant={layoutStyles.titleVariant}
              sx={{
                fontWeight: 600,
                color: '#1a1a1a',
                mb: author || filesize ? 0.5 : 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </Typography>
            {(author || filesize) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {author && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: 'clamp(0.7rem, 0.5vw + 0.65rem, 0.8125rem)',
                    }}
                  >
                    By: {author}
                  </Typography>
                )}
                {author && filesize && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    •
                  </Typography>
                )}
                {filesize && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: 'clamp(0.7rem, 0.5vw + 0.65rem, 0.8125rem)',
                    }}
                  >
                    {formatFileSize(filesize)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              ...layoutStyles.touchTarget,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                color: 'text.primary',
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Controls Bar */}
        {!loading && !error && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: layoutStyles.padding,
              py: 1.5,
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#ffffff',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Zoom controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  sx={{
                    minWidth: isMobile ? '40px' : '90px',
                    borderColor: '#dee2e6',
                    color: '#495057',
                    '&:hover': {
                      borderColor: '#0D5CA2',
                      backgroundColor: 'rgba(13, 92, 162, 0.04)',
                    },
                  }}
                >
                  <ZoomOut sx={{ fontSize: 20 }} />
                  {!isMobile && <Box component="span" sx={{ ml: 0.5 }}>Out</Box>}
                </Button>
                <Button
                  onClick={handleResetZoom}
                  sx={{
                    minWidth: isMobile ? '50px' : '70px',
                    borderColor: '#dee2e6',
                    color: '#495057',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#0D5CA2',
                      backgroundColor: 'rgba(13, 92, 162, 0.04)',
                    },
                  }}
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button
                  onClick={handleZoomIn}
                  disabled={scale >= 3.0}
                  sx={{
                    minWidth: isMobile ? '40px' : '90px',
                    borderColor: '#dee2e6',
                    color: '#495057',
                    '&:hover': {
                      borderColor: '#0D5CA2',
                      backgroundColor: 'rgba(13, 92, 162, 0.04)',
                    },
                  }}
                >
                  <ZoomIn sx={{ fontSize: 20 }} />
                  {!isMobile && <Box component="span" sx={{ ml: 0.5 }}>In</Box>}
                </Button>
              </ButtonGroup>
            </Box>

            {/* Center: Page navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                sx={{
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  ...layoutStyles.touchTarget,
                  '&:hover': {
                    borderColor: '#0D5CA2',
                    backgroundColor: 'rgba(13, 92, 162, 0.04)',
                  },
                  '&.Mui-disabled': {
                    borderColor: '#e9ecef',
                  },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  minWidth: isMobile ? '70px' : '100px',
                  textAlign: 'center',
                  fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.875rem)',
                  color: '#1a1a1a',
                }}
              >
                {currentPage} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                sx={{
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  ...layoutStyles.touchTarget,
                  '&:hover': {
                    borderColor: '#0D5CA2',
                    backgroundColor: 'rgba(13, 92, 162, 0.04)',
                  },
                  '&.Mui-disabled': {
                    borderColor: '#e9ecef',
                  },
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* PDF Content Area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: loading || error ? 'center' : 'flex-start',
            p: loading || error ? 3 : 2,
            backgroundColor: '#525659',
          }}
        >
          {loading && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={48} sx={{ color: '#0D5CA2', mb: 2 }} />
              <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
                Loading PDF...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ maxWidth: '400px', width: '100%', px: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <ErrorIcon sx={{ fontSize: 64, color: '#dc3545', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
                  Unable to Load PDF
                </Typography>
              </Box>
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: '12px',
                  '& .MuiAlert-message': {
                    fontSize: 'clamp(0.8125rem, 0.5vw + 0.75rem, 0.875rem)',
                  },
                }}
              >
                {error}
              </Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={onClose}
                sx={{
                  bgcolor: '#dc3545',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.25,
                  borderRadius: '8px',
                  '&:hover': {
                    bgcolor: '#c82333',
                  },
                }}
              >
                Close
              </Button>
            </Box>
          )}

          {!loading && !error && (
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                p: 2,
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '4px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default PDFPreviewModal;
