import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSessionCheck } from '../../utils/useSessionCheck';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Checkbox,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Grow,
  Fade,
} from '@mui/material';
import { Close, Send, AttachFile, Delete } from '@mui/icons-material';
import { MessageSquareMore } from 'lucide-react';
import type { PluginFeedback, PluginFeedbackContext } from '../../types/app';

interface PluginFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  currentView: string;
  recentError?: string;
  onSubmit?: (feedback: PluginFeedback) => Promise<void> | void;
}

interface IssueCategory {
  id: string;
  title: string;
}

const issueCategories: IssueCategory[] = [
  {
    id: 'generation',
    title: 'Content Creation Issue',
  },
  {
    id: 'workflow',
    title: 'Usability Problem',
  },
  {
    id: 'feature_requests',
    title: 'Enhancement Idea',
  },
  {
    id: 'billing',
    title: 'Subscription & Billing',
  },
];

const PluginFeedbackModal: React.FC<PluginFeedbackModalProps> = ({
  open,
  onClose,
  currentView,
  recentError,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Session check: redirect to login if session expired when modal opens
  const { checkSession } = useSessionCheck(window.MOODLE_CONTEXT ?? null);
  useEffect(() => {
    if (open) {
      checkSession();
    }
  }, [open, checkSession]);

  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    generation: false,
    workflow: false,
    feature_requests: false,
    billing: false,
  });

  const [additionalDetails, setAdditionalDetails] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Auto-detect context
  const [context, setContext] = useState<PluginFeedbackContext>({
    currentView: '',
    deviceInfo: {
      browser: '',
      os: '',
      screenSize: '',
    },
    timestamp: 0,
  });

  // Memoize utility functions
  const getBrowserName = useCallback((userAgent: string): string => {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) { return 'Chrome' };
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) { return 'Safari' };
    if (userAgent.includes('Firefox')) { return 'Firefox' };
    if (userAgent.includes('Edg')) { return 'Edge' };
    return 'Unknown';
  }, []);

  const getOSName = useCallback((userAgent: string): string => {
    if (userAgent.includes('Win')) { return 'Windows' };
    if (userAgent.includes('Mac')) { return 'macOS' };
    if (userAgent.includes('Linux')) { return 'Linux' };
    if (userAgent.includes('Android')) { return 'Android' };
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) { return 'iOS' };
    return 'Unknown';
  }, []);

  useEffect(() => {
    if (open) {
      const userAgent = navigator.userAgent;
      setContext({
        currentView,
        recentError,
        deviceInfo: {
          browser: getBrowserName(userAgent),
          os: getOSName(userAgent),
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
        },
        timestamp: Date.now(),
      });
    }
  }, [open, currentView, recentError, getBrowserName, getOSName]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (attachments.length === 0 && event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      if (file.size > 1 * 1024 * 1024) {
        setFileError('Screenshot exceeds the 1MB maximum limit.');
        event.target.value = '';
        return;
      }

      setAttachments([file]);

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setImagePreview(null);
    setFileError(null);
  };

  const handleSubmit = async () => {
    const hasSelectedCategory = Object.values(selectedCategories).some(val => val);
    const hasText = additionalDetails.trim().length > 0;

    if (!hasSelectedCategory || !hasText) {
      return;
    }

    setIsSubmitting(true);

    const selectedCategoryIds = Object.keys(selectedCategories).filter(
      (catId) => selectedCategories[catId]
    );

    const feedback: PluginFeedback = {
      selectedCategories: selectedCategoryIds,
      additionalDetails: additionalDetails.trim(),
      context,
      attachments,
    };

    try {
      if (onSubmit) {
        await onSubmit(feedback);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setIsSubmitting(false);
      return;
    }

    setSelectedCategories({
      generation: false,
      workflow: false,
      feature_requests: false,
      billing: false,
    });
    setAdditionalDetails('');
    setAttachments([]);
    setImagePreview(null);
    setFileError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = useCallback(() => {
    if (isSubmitting) { return };

    setSelectedCategories({
      generation: false,
      workflow: false,
      feature_requests: false,
      billing: false,
    });
    setAdditionalDetails('');
    setAttachments([]);
    setImagePreview(null);
    setFileError(null);
    onClose();
  }, [isSubmitting, onClose]);

  const isSubmitDisabled = useMemo(() => {
    const hasSelectedCategory = Object.values(selectedCategories).some(val => val);
    const hasText = additionalDetails.trim().length > 0;
    return !hasSelectedCategory || !hasText || isSubmitting;
  }, [selectedCategories, additionalDetails, isSubmitting]);

  return (
    <Modal
      open={open}
      onClose={(e, reason) => {
        if (isSubmitting) { return };
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') { handleClose() };
      }}
      disableEscapeKeyDown={isSubmitting}
      sx={{
        zIndex: 100000,
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      <Box
        sx={{
          position: isMobile ? 'fixed' : 'absolute',
          top: isMobile ? 0 : '50%',
          left: isMobile ? 0 : '50%',
          transform: isMobile ? 'none' : 'translate(-50%, -50%)',
          width: isMobile ? '100%' : 'clamp(400px, 90vw, 560px)',
          maxHeight: isMobile ? '100dvh' : '85vh',
          height: isMobile ? '100dvh' : 'auto',
          borderRadius: isMobile ? 0 : '16px',
          boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 'clamp(16px, 2vh, 24px)',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: 'rgba(15, 108, 191, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquareMore size={20} strokeWidth={2} color="#0f6cbf" />
            </Box>
            <Box>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
                Report Issue
              </Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Help us improve PRISM
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            p: 'clamp(16px, 2vh, 24px)',
            overflow: 'auto',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              mb: 2,
              fontWeight: 700,
              color: '#334155',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            What would you like to report?
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {issueCategories.map((category) => {
              const isChecked = selectedCategories[category.id];
              return (
                <Box
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  sx={{
                    border: '1.5px solid',
                    borderColor: isChecked ? '#0f6cbf' : '#e2e8f0',
                    borderRadius: '12px',
                    backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: isChecked ? '#e0f0ff' : '#f8fafc',
                    },
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleCategoryToggle(category.id)}
                    onClick={(e) => e.stopPropagation()}
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
                      flex: 1,
                      fontWeight: isChecked ? 600 : 500,
                      color: isChecked ? '#0f6cbf' : '#334155',
                      fontSize: '0.875rem',
                    }}
                  >
                    {category.title}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              Describe your issue
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={isMobile ? 3 : 4}
              placeholder="Please provide more details..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              disabled={isSubmitting}
              inputProps={{
                maxLength: 1000,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#cbd5e1',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0f6cbf',
                    borderWidth: '1.5px',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              Attach Screenshot (Optional)
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<AttachFile />}
              disabled={isSubmitting || attachments.length >= 1}
              sx={{
                textTransform: 'none',
                borderColor: '#e2e8f0',
                color: '#475569',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                fontWeight: 500,
                '&:hover:not(:disabled)': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                },
                '&:focus': {
                  boxShadow: 'none !important',
                },
                '&:disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed',
                },
              }}
            >
              Upload Screenshot
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>

            {fileError && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                {fileError}
              </Typography>
            )}

            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                {attachments.map((file, index) => (
                  <Grow
                    key={file.name}
                    in={true}
                    timeout={400}
                    style={{ transformOrigin: 'top center' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#0f6cbf',
                          boxShadow: '0 4px 6px -1px rgba(15, 108, 191, 0.1)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      {/* Thumbnail Preview */}
                      {imagePreview && (
                        <Fade in={true} timeout={600}>
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '8px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#f8fafc',
                            }}
                          >
                            <img
                              src={imagePreview}
                              alt={file.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        </Fade>
                      )}

                      {/* File Info */}
                      <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                        <Typography
                          noWrap
                          variant="body2"
                          sx={{
                            color: '#1e293b',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          {file.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                            }}
                          >
                            {(file.size / 1024).toFixed(1)} KB
                          </Typography>
                          <Box
                            sx={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              backgroundColor: '#cbd5e1',
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontSize: '0.75rem',
                            }}
                          >
                            Image
                          </Typography>
                        </Box>
                      </Box>

                      {/* Delete Button */}
                      <IconButton
                        size="small"
                        onClick={() => removeAttachment(index)}
                        disabled={isSubmitting}
                        sx={{
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            color: '#dc2626',
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grow>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            p: 'clamp(16px, 2vh, 24px)',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={isSubmitting}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: '#64748b',
              borderColor: '#cbd5e1',
              px: 'clamp(16px, 3vw, 24px)',
              py: 'clamp(8px, 1.5vh, 12px)',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              minWidth: 'clamp(80px, 15vw, 100px)',
              whiteSpace: 'nowrap',
              '&:hover:not(:disabled)': {
                borderColor: '#94a3b8',
                backgroundColor: '#f8fafc',
              },
              '&:disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitDisabled}
            startIcon={isSubmitting ? <CircularProgress size="clamp(14px, 1vw, 16px)" sx={{ color: 'white' }} /> : <Send />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#0f6cbf',
              px: 'clamp(16px, 3vw, 24px)',
              py: 'clamp(8px, 1.5vh, 12px)',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              minWidth: 'clamp(120px, 25vw, 150px)',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              '&:hover:not(:disabled)': {
                bgcolor: '#0c5aa8',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              },
              '&:disabled': {
                bgcolor: '#e2e8f0',
                color: '#94a3b8',
                cursor: 'not-allowed',
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default PluginFeedbackModal;