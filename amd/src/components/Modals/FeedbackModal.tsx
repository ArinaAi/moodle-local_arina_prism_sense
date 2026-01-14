// components/modals/FeedbackModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Rating,
  RadioGroup,
  Radio,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, Send } from '@mui/icons-material';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: { rating: number; category: string; comments: string }) => void;
}

// Helper functions split to reduce cognitive complexity (max 15 per function)
const getModalBoxStyles = (isMobile: boolean) => ({
  position: isMobile ? 'fixed' as const : 'absolute' as const,
  top: isMobile ? 0 : '50%',
  left: isMobile ? 0 : '50%',
  right: isMobile ? 0 : 'auto',
  bottom: isMobile ? 0 : 'auto',
  transform: isMobile ? 'none' : 'translate(-50%, -50%)',
  width: isMobile ? '100%' : { sm: '500px' },
  maxHeight: isMobile ? '100vh' : '80vh',
  borderRadius: isMobile ? 0 : 1,
  boxShadow: isMobile ? 'none' : 24,
});

const getTypographyStyles = (isMobile: boolean): {
  padding: number;
  titleVariant: 'subtitle1' | 'h6';
  subtitleFontSize: string;
  touchTarget: { minWidth: string; minHeight: string };
} => ({
  padding: isMobile ? 2 : 3,
  titleVariant: isMobile ? 'subtitle1' : 'h6',
  subtitleFontSize: isMobile ? '0.75rem' : '0.875rem',
  touchTarget: {
    minWidth: isMobile ? '44px' : 'auto',
    minHeight: isMobile ? '44px' : 'auto',
  },
});

const getContentStyles = (isMobile: boolean) => ({
  ratingFontSize: isMobile ? '2rem' : '2.5rem',
  sectionMb: isMobile ? 3 : 4,
  ratingPadding: isMobile ? 1.5 : 2,
  gridColumns: isMobile ? '1fr' : '1fr 1fr',
});

const getFooterStyles = (isMobile: boolean) => ({
  flexDirection: isMobile ? 'column-reverse' as const : 'row' as const,
  alignItems: isMobile ? 'stretch' : 'center',
  gap: isMobile ? 1.5 : 2,
});

// Compose all styles
const getFeedbackModalStyles = (isMobile: boolean) => ({
  modal: getModalBoxStyles(isMobile),
  layout: { ...getTypographyStyles(isMobile), ...getContentStyles(isMobile) },
  footer: getFooterStyles(isMobile),
});

const categories = [
  { value: 'content', label: 'Content Quality' },
  { value: 'structure', label: 'Structure & Flow' },
  { value: 'examples', label: 'Examples & Explanations' },
  { value: 'other', label: 'Other' },
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose, onSubmitFeedback }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [rating, setRating] = useState<number | null>(0);
  const [category, setCategory] = useState('content');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use external helper functions
  const styles = getFeedbackModalStyles(isMobile);

  const handleSubmit = () => {
    if (!rating) {
      alert('Please provide a rating');
      return;
    }

    if (!comments.trim()) {
      alert('Please provide additional details about what needs improvement');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      onSubmitFeedback({
        rating,
        category,
        comments,
      });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 100001 }}>
      <Box
        sx={{
          ...styles.modal,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: styles.layout.padding,
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography
                variant={styles.layout.titleVariant}
                component="h2"
                sx={{ fontWeight: 700, color: '#1a1a1a' }}
              >
                Provide Feedback
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5, fontSize: styles.layout.subtitleFontSize }}>
                Help us regenerate better slides
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '50%',
              ...styles.layout.touchTarget,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Content - Scrollable */}
        <Box sx={{
          p: styles.layout.padding,
          overflow: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Rating Section */}
          <Box sx={{ textAlign: 'center', mb: styles.layout.sectionMb }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#1e293b' }}>
              How was the generated content?
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                p: styles.layout.ratingPadding,
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue)}
                size="large"
                sx={{
                  '& .MuiRating-icon': {
                    fontSize: styles.layout.ratingFontSize,
                  },
                }}
              />
            </Box>
          </Box>

          {/* Category Selection - Grid Layout */}
          <Box sx={{ mb: styles.layout.sectionMb }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#334155', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              What needs improvement?
            </Typography>
            <RadioGroup value={category} onChange={(e) => setCategory(e.target.value)}>
              <Box sx={{ display: 'grid', gridTemplateColumns: styles.layout.gridColumns, gap: 2 }}>
                {categories.map((cat) => (
                  <Box
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    sx={{
                      position: 'relative',
                      border: '2px solid',
                      borderColor: category === cat.value ? '#0f6cbf' : '#e2e8f0',
                      borderRadius: '12px',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: category === cat.value ? '#f0f7ff' : '#ffffff',
                      '&:hover': {
                        borderColor: '#0f6cbf',
                        backgroundColor: '#f8fafc',
                      },
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Radio
                      checked={category === cat.value}
                      sx={{
                        p: 0,
                        color: '#cbd5e1',
                        '&.Mui-checked': {
                          color: '#0f6cbf',
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: category === cat.value ? 600 : 500,
                        color: category === cat.value ? '#0f6cbf' : '#475569',
                      }}
                    >
                      {cat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </RadioGroup>
          </Box>

          {/* Comments Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#334155', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              Additional Details <Box component="span" sx={{ color: '#dc3545' }}>*</Box>
            </Typography>
            <TextField
              multiline
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us more about what you'd like to see changed..."
              fullWidth
              variant="outlined"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                    borderColor: '#0f6cbf',
                    boxShadow: '0 0 0 3px rgba(15, 108, 191, 0.1)',
                    '& fieldset': { borderWidth: '0 !important' },
                  },
                  '& fieldset': { border: 'none' },
                },
              }}
            />
          </Box>

          <Alert
            severity="info"
            sx={{
              borderRadius: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px dashed #bae6fd',
              color: '#0369a1',
              '& .MuiAlert-icon': {
                color: '#0284c7',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              AI will use your feedback to regenerate better slides immediately.
            </Typography>
          </Alert>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: styles.layout.padding,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            ...styles.footer,
            justifyContent: 'flex-end',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <Button
            onClick={onClose}
            variant="text"
            fullWidth={isMobile}
            sx={{
              color: '#64748b',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              ...styles.layout.touchTarget,
              '&:hover': {
                backgroundColor: '#f1f5f9',
                color: '#475569',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
            disabled={isSubmitting || !rating || !comments.trim()}
            fullWidth={isMobile}
            sx={{
              fontWeight: 700,
              py: 1.5,
              px: 4,
              ...styles.layout.touchTarget,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e',
                transform: 'none',
                boxShadow: 'none',
              },
            }}
          >
            {isSubmitting ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default FeedbackModal;