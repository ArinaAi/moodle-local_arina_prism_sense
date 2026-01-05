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
} from '@mui/material';
import { Close, Send } from '@mui/icons-material';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: { rating: number; category: string; comments: string }) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose, onSubmitFeedback }) => {
  const [rating, setRating] = useState<number | null>(0);
  const [category, setCategory] = useState('content');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const categories = [
    { value: 'content', label: 'Content Quality' },
    { value: 'structure', label: 'Structure & Flow' },
    { value: 'examples', label: 'Examples & Explanations' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 100001 }}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '500px' },
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 24,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
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
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                Provide Feedback
              </Typography>
              <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                Help us regenerate better slides
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '50%',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Content - Scrollable */}
        <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
          {/* Rating Section */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#1e293b' }}>
              How was the generated content?
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
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
                    fontSize: '2.5rem',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Category Selection - Grid Layout */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#334155', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              What needs improvement?
            </Typography>
            <RadioGroup value={category} onChange={(e) => setCategory(e.target.value)}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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
            p: 3,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            flexShrink: 0,
            gap: 2,
          }}
        >
          <Button
            onClick={onClose}
            variant="text"
            sx={{
              color: '#64748b',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
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
            sx={{
              fontWeight: 700,
              py: 1.5,
              px: 4,
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