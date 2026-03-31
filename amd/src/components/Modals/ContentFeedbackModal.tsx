// components/Modals/ContentFeedbackModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Checkbox,
  Alert,
  CircularProgress,
  Collapse,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  Send,
  MenuBook,
  Compress,
  Warning,
  LibraryBooks,
  Shuffle,
} from '@mui/icons-material';
import { TopicPillSelector, ChipInput, DraggableTopicList } from './FeedbackComponents';
import { useTOC } from '../../hooks/useTOC';
import {
  FEEDBACK_CATEGORIES,
  createEmptyFeedbackData,
  type ContentFeedbackData,
  type FeedbackCategoryId,
  type ContentFeedbackModalProps,
} from '../../types/feedback';

// Icon mapping for categories - memoized outside component to prevent recreation
const CATEGORY_ICONS: Record<string, JSX.Element> = {
  MenuBook: <MenuBook sx={{ fontSize: 20 }} />,
  Compress: <Compress sx={{ fontSize: 20 }} />,
  Warning: <Warning sx={{ fontSize: 20 }} />,
  LibraryBooks: <LibraryBooks sx={{ fontSize: 20 }} />,
  Shuffle: <Shuffle sx={{ fontSize: 20 }} />,
};

// Credit cost mapping (same as CurriculumModal)
const CREDIT_COST: Record<string, number> = {
  '5': 6,   // Express
  '15': 8,  // Standard
  '30': 10, // Extensive / Deep Dive
};

// Helper: Get modal container styles
const getModalStyles = (isMobile: boolean) => ({
  position: isMobile ? ('fixed' as const) : ('absolute' as const),
  top: isMobile ? 0 : '50%',
  left: isMobile ? 0 : '50%',
  right: isMobile ? 0 : 'auto',
  bottom: isMobile ? 0 : 'auto',
  transform: isMobile ? 'none' : 'translate(-50%, -50%)',
  width: isMobile ? '100%' : 'clamp(400px, 90vw, 560px)',
  maxHeight: isMobile ? '100dvh' : '85vh',
  height: isMobile ? '100dvh' : 'auto',
  borderRadius: isMobile ? 0 : '16px',
  boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
});

const ContentFeedbackModal: React.FC<ContentFeedbackModalProps> = ({
  open,
  onClose,
  onSubmitFeedback,
  contentId,
  availableBalance,
  videoLength,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Memoize modal styles to prevent recalculation
  const modalStyles = useMemo(() => getModalStyles(isMobile), [isMobile]);

  // Fetch TOC data
  const { topicTitles, loading: tocLoading } = useTOC(contentId, open);

  // Category checkboxes state
  const [checkedCategories, setCheckedCategories] = useState<Set<FeedbackCategoryId>>(new Set());

  // Feedback data state
  const [feedbackData, setFeedbackData] = useState<ContentFeedbackData>(createEmptyFeedbackData());

  // Reordered topics for drag-drop (initialize from TOC)
  const [reorderedTopics, setReorderedTopics] = useState<string[]>([]);

  // Track if topic order was changed
  const [orderChanged, setOrderChanged] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credit check
  const requiredCredits = CREDIT_COST[videoLength] ?? 6;
  const hasInsufficientCredits = availableBalance < requiredCredits;

  // Initialize reordered topics when TOC loads
  useEffect(() => {
    if (topicTitles.length > 0 && reorderedTopics.length === 0) {
      setReorderedTopics(topicTitles);
    }
  }, [topicTitles, reorderedTopics.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCheckedCategories(new Set());
      setFeedbackData(createEmptyFeedbackData());
      setReorderedTopics([]);
      setOrderChanged(false);
    }
  }, [open]);

  // Check if any feedback has been provided
  const hasValidFeedback = useMemo(() => {
    if (checkedCategories.size === 0) {
      return false;
    }

    // Check if at least one checked category has input
    const categoriesArray = Array.from(checkedCategories);
    for (const categoryId of categoriesArray) {
      switch (categoryId) {
        case 'topics_need_depth':
          if (feedbackData.topicsNeedingDepth.length > 0) {
            return true;
          }
          break;
        case 'topics_overexplained':
          if (feedbackData.topicsOverExplained.length > 0) {
            return true;
          }
          break;
        case 'curriculum_mismatch':
          if (feedbackData.extraTopics.length > 0) {
            return true;
          }
          break;
        case 'missing_subtopics':
          if (feedbackData.missingSubtopics.length > 0) {
            return true;
          }
          break;
        case 'confusing_flow':
          if (orderChanged) {
            return true;
          }
          break;
      }
    }
    return false;
  }, [checkedCategories, feedbackData, orderChanged]);

  // Handle category checkbox toggle
  const handleCategoryToggle = useCallback((categoryId: FeedbackCategoryId) => {
    setCheckedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  // Handle topic reordering
  const handleReorder = useCallback((newOrder: string[]) => {
    setReorderedTopics(newOrder);
    // Check if order actually changed from original
    const changed = newOrder.some((topic, index) => topic !== topicTitles[index]);
    setOrderChanged(changed);
  }, [topicTitles]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);

    const submitData: ContentFeedbackData = {
      ...feedbackData,
      reorderedTopicFlow: orderChanged ? reorderedTopics : [],
      selectedCategories: Array.from(checkedCategories),
    };

    // Simulate small delay then submit
    setTimeout(() => {
      onSubmitFeedback(submitData);
      setIsSubmitting(false);
    }, 300);
  }, [feedbackData, orderChanged, reorderedTopics, checkedCategories, onSubmitFeedback]);

  // Memoized callback handlers for feedback data updates
  const handleTopicsNeedingDepthChange = useCallback((selected: string[]) => {
    setFeedbackData((prev) => ({
      ...prev,
      topicsNeedingDepth: selected,
      topicsOverExplained: prev.topicsOverExplained.filter((t) => !selected.includes(t)),
    }));
  }, []);

  const handleTopicsOverExplainedChange = useCallback((selected: string[]) => {
    setFeedbackData((prev) => ({
      ...prev,
      topicsOverExplained: selected,
      topicsNeedingDepth: prev.topicsNeedingDepth.filter((t) => !selected.includes(t)),
    }));
  }, []);

  const handleExtraTopicsChange = useCallback((selected: string[]) => {
    setFeedbackData((prev) => ({ ...prev, extraTopics: selected }));
  }, []);

  const handleMissingSubtopicsChange = useCallback((chips: string[]) => {
    setFeedbackData((prev) => ({ ...prev, missingSubtopics: chips }));
  }, []);

  // Render the input section for each category
  const renderCategoryInput = useCallback((categoryId: FeedbackCategoryId) => {
    switch (categoryId) {
      case 'topics_need_depth':
        return (
          <TopicPillSelector
            topics={topicTitles}
            selectedTopics={feedbackData.topicsNeedingDepth}
            onSelectionChange={handleTopicsNeedingDepthChange}
            loading={tocLoading}
            emptyMessage="Loading topics..."
          />
        );

      case 'topics_overexplained':
        return (
          <TopicPillSelector
            topics={topicTitles}
            selectedTopics={feedbackData.topicsOverExplained}
            onSelectionChange={handleTopicsOverExplainedChange}
            loading={tocLoading}
            emptyMessage="Loading topics..."
          />
        );

      case 'curriculum_mismatch':
        return (
          <TopicPillSelector
            topics={topicTitles}
            selectedTopics={feedbackData.extraTopics}
            onSelectionChange={handleExtraTopicsChange}
            loading={tocLoading}
            emptyMessage="Loading topics..."
          />
        );

      case 'missing_subtopics':
        return (
          <ChipInput
            chips={feedbackData.missingSubtopics}
            onChipsChange={handleMissingSubtopicsChange}
            placeholder="Add missing subtopics..."
          />
        );

      case 'confusing_flow':
        return (
          <Box>
            <DraggableTopicList
              topics={reorderedTopics.length > 0 ? reorderedTopics : topicTitles}
              originalTopics={topicTitles}
              onReorder={handleReorder}
              loading={tocLoading}
              orderChanged={orderChanged}
              captionText="Drag topics to reorder them"
            />
          </Box>
        );

      default:
        return null;
    }
  }, [
    topicTitles,
    feedbackData,
    tocLoading,
    reorderedTopics,
    orderChanged,
    handleTopicsNeedingDepthChange,
    handleTopicsOverExplainedChange,
    handleExtraTopicsChange,
    handleMissingSubtopicsChange,
    handleReorder,
  ]);

  const styles = modalStyles;

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 100001 }}>
      <Box
        sx={{
          ...styles,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
              <Send sx={{ color: '#0f6cbf', fontSize: 20, transform: 'rotate(-45deg)' }} />
            </Box>
            <Box>
              <Typography
                variant={isMobile ? 'subtitle1' : 'h6'}
                component="h2"
                sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}
              >
                Improve Content
              </Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Requires {requiredCredits} credits to regenerate
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
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

        {/* Content - Scrollable */}
        <Box
          sx={{
            p: 'clamp(16px, 2vh, 24px)',
            overflow: 'auto',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Section Title */}
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
            What should be improved?
          </Typography>

          {/* Feedback Categories */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {FEEDBACK_CATEGORIES.map((category) => {
              const isChecked = checkedCategories.has(category.id);
              return (
                <Box
                  key={category.id}
                  sx={{
                    border: '1.5px solid',
                    borderColor: isChecked ? '#0f6cbf' : '#e2e8f0',
                    borderRadius: '12px',
                    backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Checkbox Row */}
                  <Box
                    onClick={() => handleCategoryToggle(category.id)}
                    sx={{
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
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: isChecked ? 'rgba(15, 108, 191, 0.15)' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isChecked ? '#0f6cbf' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      {CATEGORY_ICONS[category.icon]}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        fontWeight: isChecked ? 600 : 500,
                        color: isChecked ? '#0f6cbf' : '#334155',
                        fontSize: '0.875rem',
                      }}
                    >
                      {category.label}
                    </Typography>
                  </Box>

                  {/* Expandable Input Section */}
                  <Collapse in={isChecked} timeout={200}>
                    <Box
                      sx={{
                        px: 2,
                        pb: 2,
                        pt: 0.5,
                        borderTop: '1px solid #e2e8f0',
                        backgroundColor: '#fafcff',
                      }}
                    >
                      {renderCategoryInput(category.id)}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>

          {/* Info Alert */}
          <Alert
            severity="info"
            sx={{
              mt: 3,
              borderRadius: '10px',
              backgroundColor: '#f0f9ff',
              border: '1px dashed #bae6fd',
              color: '#0369a1',
              '& .MuiAlert-icon': {
                color: '#0284c7',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
              AI will use your selections to regenerate better slides immediately.
            </Typography>
          </Alert>

          {/* Insufficient credits warning */}
          {hasInsufficientCredits && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mt: 2,
                p: 1.5,
                borderRadius: '8px',
                bgcolor: 'rgba(249, 115, 22, 0.08)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
              }}
            >
              <Box
                component="span"
                sx={{
                  mt: '2px',
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                !
              </Box>
              <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 500, lineHeight: 1.5 }}>
                You need <strong>{requiredCredits} credits</strong> to regenerate, but you only have{' '}
                <strong>{Math.floor(availableBalance)} credit{Math.floor(availableBalance) !== 1 ? 's' : ''}</strong> available. Please contact your admin to get more credits.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 'clamp(16px, 2vh, 24px)',
            paddingBottom: 'max(clamp(16px, 2vh, 24px), env(safe-area-inset-bottom))',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: isMobile ? 'column-reverse' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'flex-end',
            gap: 'clamp(12px, 1.5vh, 16px)',
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
              borderRadius: '10px',
              px: 3,
              py: 1.25,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#f1f5f9',
                color: '#475569',
              },
            }}
          >
            Cancel
          </Button>
          <Tooltip
            title={
              hasInsufficientCredits
                ? `You need ${requiredCredits} credits but only have ${availableBalance} available`
                : ''
            }
            arrow
            disableHoverListener={!hasInsufficientCredits}
            PopperProps={{ sx: { zIndex: 100003 } }}
          >
            <span>
              <Button
                onClick={handleSubmit}
                variant="contained"
                startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
                disabled={isSubmitting || !hasValidFeedback || hasInsufficientCredits}
                fullWidth={isMobile}
                sx={{
                  fontWeight: 700,
                  py: 1.25,
                  px: 3,
                  borderRadius: '10px',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                    boxShadow: '0 6px 20px rgba(15, 108, 191, 0.35)',
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: '#e5e7eb',
                    color: '#9ca3af',
                    transform: 'none',
                    boxShadow: 'none',
                  },
                }}
              >
                {isSubmitting ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Modal>
  );
};

export default ContentFeedbackModal;
