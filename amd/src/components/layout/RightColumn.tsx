// components/layout/RightColumn.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  useTheme,
  List,
  ListItem,
  Tooltip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle,
  Visibility,
  Add,
  Error as ErrorIcon,
  Delete,
  MoreVert,
} from '@mui/icons-material';
import { FileText, Presentation } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

import type { ContentItem } from '../../types/app';

interface RightColumnProps {
  state: {
    contentItems: ContentItem[];
  };
  onPublishContent: (contentId: string) => void;
  onPreviewContent?: (contentId: number) => void;
  onClearAll?: () => void;
  onDeleteContent?: (contentId: number) => void;
  isMobile?: boolean;
  isLoading?: boolean;
}

const RightColumn: React.FC<RightColumnProps> = ({
  state,
  onPublishContent,
  onPreviewContent,
  onClearAll,
  onDeleteContent,
  isMobile = false,
  isLoading = false
}) => {
  const theme = useTheme();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; contentId: number | null }>({
    open: false,
    contentId: null,
  });
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement | null; contentId: number | null }>({
    element: null,
    contentId: null,
  });

  // Separate content by status
  const generatingItems = state.contentItems.filter(item => item.status === 'generating');
  const readyItems = state.contentItems.filter(item => item.status === 'ready');
  const publishedItems = state.contentItems.filter(item => item.status === 'published');
  const errorItems = state.contentItems.filter(item => item.status === 'error');

  // Debug: Log state changes


  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  };

  const getSlideCount = (item: ContentItem): number => {
    if (!item.result || !item.result.results) { return 0 };
    return item.result.results.reduce((total, subtopic) => {
      return total + (subtopic.slideCount || 0);
    }, 0);
  };





  /* Helper Functions */
  const renderLoadingState = () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 6,
      }}
    >
      <CircularProgress size={40} thickness={4} sx={{ mb: 2 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Loading content...
      </Typography>
    </Box>
  );

  const renderEmptyState = () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 6,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(108, 117, 125, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <FileText size={28} color="#6c757d" strokeWidth={2} />
      </Box>
      <Typography
        variant="body1"
        sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}
      >
        No content yet
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Generate slides to see content here
      </Typography>
    </Box>
  );

  const renderGeneratingItem = (item: ContentItem) => (
    <ListItem
      key={item.id}
      sx={{
        border: `1px solid ${theme.palette.warning.light}`,
        borderRadius: '20px',
        mb: 1.5,
        p: 2,
        backgroundColor: 'rgba(255, 193, 7, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 193, 7, 0.2), transparent)',
          animation: 'shimmer 2s infinite',
        },
        '@keyframes shimmer': {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      }}
    >
      {/* Loading Icon */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} thickness={4} sx={{ color: theme.palette.warning.main }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {item.sectionname}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status="generating" size="small" />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Started {formatDate(item.timecreated)}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          This may take a few moments. You&apos;ll be notified when ready.
        </Typography>
      </Box>
    </ListItem>
  );

  const renderReadyItem = (item: ContentItem) => (
    <ListItem
      key={item.id}
      sx={{
        border: `1px solid ${theme.palette.success.light}`,
        borderRadius: '20px',
        mb: 1.5,
        p: 2,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateX(4px)',
          boxShadow: '0 6px 16px rgba(40, 167, 69, 0.2)',
          borderColor: theme.palette.success.main
        },
      }}
      onClick={() => onPreviewContent && onPreviewContent(item.id)}
    >
      {/* Icon */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Presentation size={28} color="#28a745" strokeWidth={2.5} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {item.sectionname}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={item.approved ? 'approved' : 'ready'} size="small" />
          <Chip
            label={`${getSlideCount(item)} slides`}
            size="small"
            sx={{
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              color: '#28a745',
              fontWeight: 500,
              fontSize: '0.7rem',
              height: '20px',
            }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {item.approved ? 'Ready to publish' : 'Pending approval'} • {formatDate(item.timecreated)}
          </Typography>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Preview slides" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (item.result) {
                window.dispatchEvent(new CustomEvent('lecturebot:preview', {
                  detail: { contentItem: item }
                }));
              }
            }}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: 'info.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'info.dark',
              },
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={item.approved ? "Publish to course page" : "Approve content first"} arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
          <span>
            <IconButton
              size="small"
              disabled={!item.approved}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onPublishContent(`content-${item.id}`);
              }}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: item.approved ? 'success.main' : 'grey.300',
                color: 'white',
                '&:hover': {
                  backgroundColor: item.approved ? 'success.dark' : 'grey.400',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'grey.300',
                  color: 'grey.500',
                },
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="More options" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setMenuAnchor({ element: e.currentTarget, contentId: item.id });
            }}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: 'grey.300',
              color: 'grey.700',
              '&:hover': {
                backgroundColor: 'grey.400',
              },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  );

  const renderErrorItem = (item: ContentItem) => (
    <ListItem
      key={item.id}
      sx={{
        border: `1px solid ${theme.palette.error.light}`,
        borderRadius: '20px',
        mb: 1.5,
        p: 2,
        backgroundColor: 'rgba(220, 53, 69, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Error Icon */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ErrorIcon sx={{ fontSize: 28, color: theme.palette.error.main }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {item.sectionname}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status="error" size="small" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {item.errormessage || 'Generation failed'}
          </Typography>
        </Box>
      </Box>
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="More options" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setMenuAnchor({ element: e.currentTarget, contentId: item.id });
            }}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: 'grey.300',
              color: 'grey.700',
              '&:hover': {
                backgroundColor: 'grey.400',
              },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  );

  const renderGeneratedContent = () => {
    if (isLoading) {
      return renderLoadingState();
    }

    if (generatingItems.length === 0 && readyItems.length === 0 && errorItems.length === 0) {
      return renderEmptyState();
    }

    return (
      <List sx={{
        flex: 1,
        overflow: 'auto',
        p: 0,
        pr: 1,
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE and Edge
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}>
        {/* Generating Items */}
        {generatingItems.map(renderGeneratingItem)}

        {/* Ready Items */}
        {readyItems.map(renderReadyItem)}

        {/* Error Items */}
        {errorItems.map(renderErrorItem)}
      </List>
    );
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: isMobile ? 'auto' : '100%',
          maxWidth: '100%',
        }}
      >
        {/* Generated Content Card */}
        <Card sx={{ flex: 1.5, minHeight: isMobile ? 'auto' : '340px', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            p: 2,
            pr: 1,
            '&:last-child': {
              pb: 2,
            }
          }}>
            {/* Header */}
            <Box sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}`, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h2">
                Generated Content
              </Typography>

            </Box>

            {renderGeneratedContent()}
          </CardContent>
        </Card>


        {/* Published Content Card */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            p: 2,
            pr: 1,
            '&:last-child': {
              pb: 2,
            }
          }}>
            {/* Header */}
            <Box sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}`, mb: 2 }}>
              <Typography variant="h6" component="h2">
                Published Content
              </Typography>
            </Box>

            {publishedItems.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  py: 6,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 28, color: '#28a745' }} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}
                >
                  Nothing published yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Publish content to see it here
                </Typography>
              </Box>
            ) : (
              <List sx={{
                flex: 1,
                overflow: 'auto',
                p: 0,
                pr: 1,
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE and Edge
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}>
                {publishedItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      border: `1px solid ${theme.palette.success.light}`,
                      borderRadius: '20px',
                      mb: 1.5,
                      p: 2,
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 6px 16px rgba(40, 167, 69, 0.2)',
                        borderColor: theme.palette.success.main,
                      },
                    }}
                    onClick={() => onPreviewContent && onPreviewContent(item.id)}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Presentation size={28} color="#28a745" strokeWidth={2.5} />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.sectionname}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusBadge status="published" size="small" />
                        <Chip
                          label={`${getSlideCount(item)} slides`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            color: '#28a745',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            height: '20px',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.timepublished ? formatDate(item.timepublished) : 'Published'}
                        </Typography>
                      </Box>
                    </Box>

                    <Tooltip title="Preview slides" arrow placement="top" PopperProps={{ sx: { zIndex: 10006 } }}>
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (item.result) {
                            window.dispatchEvent(new CustomEvent('lecturebot:preview', {
                              detail: { contentItem: item }
                            }));
                          }
                        }}
                        sx={{
                          width: 32,
                          height: 32,
                          backgroundColor: 'info.main',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'info.dark',
                          },
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card >
      </Box >

      {/* Options Menu */}
      < Menu
        anchorEl={menuAnchor.element}
        open={Boolean(menuAnchor.element)}
        onClose={() => setMenuAnchor({ element: null, contentId: null })}
        sx={{ zIndex: 10005 }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: '180px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor.contentId) {
              setDeleteConfirmation({ open: true, contentId: menuAnchor.contentId });
            }
            setMenuAnchor({ element: null, contentId: null });
          }}
          sx={{
            color: 'error.main',
            gap: 1.5,
            py: 1.5,
            px: 2,
            '&:hover': {
              backgroundColor: 'rgba(220, 53, 69, 0.08)',
            },
          }}
        >
          <Delete fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Delete
          </Typography>
        </MenuItem>
      </Menu >

      {/* Clear All Confirmation Dialog */}
      < Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          zIndex: 10010,
          '& .MuiDialog-paper': {
            borderRadius: '20px',
            p: 1,
          },
        }}
      >
        <DialogTitle>Clear All Content?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all generated, ready, and published content from the database.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowClearDialog(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowClearDialog(false);
              if (onClearAll) {
                onClearAll();
              }
            }}
            color="error"
            variant="contained"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog >

      {/* Delete Content Confirmation Dialog */}
      < Dialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, contentId: null })}
        maxWidth="xs"
        fullWidth
        sx={{
          zIndex: 10010,
          '& .MuiDialog-paper': {
            borderRadius: '20px',
            p: 1,
          },
        }}
      >
        <DialogTitle>Delete Content?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove the content from your database but preserve the slides in Azure Storage
            for future restoration if needed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmation({ open: false, contentId: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (deleteConfirmation.contentId && onDeleteContent) {
                onDeleteContent(deleteConfirmation.contentId);
              }
              setDeleteConfirmation({ open: false, contentId: null });
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog >
    </>
  );
};
export default RightColumn;