// components/layout/RightColumn.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Delete, InfoOutlined } from '@mui/icons-material';

import type { ContentItem } from '../../types/app';
import GeneratedContentList from './GeneratedContentList';
import PublishedContentList from './PublishedContentList';

interface RightColumnProps {
  state: {
    contentItems: ContentItem[];
  };
  onPublishContent: (contentId: string) => void;
  onUnpublishContent: (contentId: string) => void;
  onClearAll?: () => void;
  onDeleteContent?: (contentId: number) => void;
  isMobile?: boolean;
  isLoading?: boolean;
  onPreviewContent?: (contentId: number) => void;
  fullHeight?: boolean;
}

// Helper function for responsive styles (moved outside to reduce complexity)
const getResponsiveStyles = (isMobile: boolean, isSmallScreen: boolean, fullHeight: boolean) => ({
  containerGap: 'clamp(12px, 1.5vh, 16px)',
  containerHeight: fullHeight || !isMobile ? '100%' : 'auto',
  menuOrigin: {
    vertical: 'bottom' as const,
    horizontal: isMobile ? 'center' as const : 'right' as const,
  },
  menuMinWidth: isMobile ? '200px' : '180px',
  menuItemPy: 'clamp(12px, 1.5vh, 16px)',
  menuItemMinHeight: isMobile ? '48px' : 'auto',
  dialogBorderRadius: isSmallScreen ? 0 : '20px',
  dialogMargin: isSmallScreen ? 0 : 2,
  dialogTitleFontSize: 'clamp(1.1rem, 1vw + 1rem, 1.25rem)',
  dialogActionsPadding: 'clamp(8px, 1vh + 4px, 16px)',
  buttonMinHeight: isMobile ? '44px' : 'auto',
});

const RightColumn: React.FC<RightColumnProps> = ({
  state,
  onPublishContent,
  onUnpublishContent,
  onClearAll,
  onDeleteContent,
  isMobile = false,
  isLoading = false,
  onPreviewContent,
  fullHeight = false,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Use external helper function
  const styles = getResponsiveStyles(isMobile, isSmallScreen, fullHeight);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; contentId: number | null }>({
    open: false,
    contentId: null,
  });
  const [unpublishConfirmation, setUnpublishConfirmation] = useState<{ open: boolean; contentId: string | null }>({
    open: false,
    contentId: null,
  });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; contentId: number | null }>({
    open: false,
    contentId: null,
  });
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement | null; contentId: number | null }>({
    element: null,
    contentId: null,
  });

  // Find the content item for showing details
  const detailsItem = detailsDialog.contentId
    ? state.contentItems.find(item => item.id === detailsDialog.contentId)
    : null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, contentId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, contentId: null });
  };

  const handleDeleteClick = () => {
    if (menuAnchor.contentId) {
      setDeleteConfirmation({ open: true, contentId: menuAnchor.contentId });
    }
    handleMenuClose();
  };

  const handleDetailsClick = () => {
    if (menuAnchor.contentId) {
      setDetailsDialog({ open: true, contentId: menuAnchor.contentId });
    }
    handleMenuClose();
  };


  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: styles.containerGap,
          height: styles.containerHeight,
          maxWidth: '100%',
          // Don't allow the entire column to scroll - let individual lists scroll
          overflow: 'hidden',
        }}
      >
        {/* Generated Content Card */}
        <GeneratedContentList
          contentItems={state.contentItems}
          isLoading={isLoading}
          onPublish={onPublishContent}
          onUnpublish={(contentId) => setUnpublishConfirmation({ open: true, contentId })}
          onMenuOpen={handleMenuOpen}
          isMobile={isMobile}
          onPreviewContent={onPreviewContent}
        />

        {/* Published Content Card */}
        <PublishedContentList
          contentItems={state.contentItems}
          onUnpublish={(contentId) => setUnpublishConfirmation({ open: true, contentId })}
          onMenuOpen={handleMenuOpen}
          isMobile={isMobile}
          onPreviewContent={onPreviewContent}
        />
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchor.element}
        open={Boolean(menuAnchor.element)}
        onClose={handleMenuClose}
        sx={{ zIndex: 100005 }}
        anchorOrigin={styles.menuOrigin}
        transformOrigin={{
          vertical: 'top',
          horizontal: styles.menuOrigin.horizontal,
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: styles.menuMinWidth,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          },
        }}
      >
        <MenuItem
          onClick={handleDetailsClick}
          sx={{
            gap: 1.5,
            py: styles.menuItemPy,
            px: 2,
            minHeight: styles.menuItemMinHeight,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <InfoOutlined fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            View Details
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{
            color: 'error.main',
            gap: 1.5,
            py: styles.menuItemPy,
            px: 2,
            minHeight: styles.menuItemMinHeight,
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
      </Menu>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isSmallScreen}
        sx={{
          zIndex: 100010,
          '& .MuiDialog-paper': {
            borderRadius: styles.dialogBorderRadius,
            p: 1,
            m: styles.dialogMargin,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: styles.dialogTitleFontSize }}>
          Clear All Content?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all generated, ready, and published content from the database.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: styles.dialogActionsPadding }}>
          <Button
            onClick={() => setShowClearDialog(false)}
            color="inherit"
            sx={{ minHeight: styles.buttonMinHeight }}
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
            sx={{ minHeight: styles.buttonMinHeight }}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Content Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ open: false, contentId: null })}
        maxWidth="xs"
        fullWidth
        fullScreen={isSmallScreen}
        sx={{
          zIndex: 100010,
          '& .MuiDialog-paper': {
            borderRadius: styles.dialogBorderRadius,
            p: 1,
            m: styles.dialogMargin,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: styles.dialogTitleFontSize }}>
          Delete Content?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this content? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: styles.dialogActionsPadding }}>
          <Button
            onClick={() => setDeleteConfirmation({ open: false, contentId: null })}
            color="inherit"
            sx={{ minHeight: styles.buttonMinHeight }}
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
            sx={{ minHeight: styles.buttonMinHeight }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unpublish Content Confirmation Dialog */}
      <Dialog
        open={unpublishConfirmation.open}
        onClose={() => setUnpublishConfirmation({ open: false, contentId: null })}
        maxWidth="xs"
        fullWidth
        fullScreen={isSmallScreen}
        sx={{
          zIndex: 100010,
          '& .MuiDialog-paper': {
            borderRadius: styles.dialogBorderRadius,
            p: 1,
            m: styles.dialogMargin,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: styles.dialogTitleFontSize }}>
          Unpublish Content?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unpublish this content? It will be removed from the course page and moved back to the Generated Content section.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: styles.dialogActionsPadding }}>
          <Button
            onClick={() => setUnpublishConfirmation({ open: false, contentId: null })}
            color="inherit"
            sx={{ minHeight: styles.buttonMinHeight }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (unpublishConfirmation.contentId && onUnpublishContent) {
                onUnpublishContent(unpublishConfirmation.contentId);
              }
              setUnpublishConfirmation({ open: false, contentId: null });
            }}
            color="warning"
            variant="contained"
            sx={{ minHeight: styles.buttonMinHeight }}
          >
            Unpublish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, contentId: null })}
        maxWidth="xs"
        fullWidth
        sx={{
          zIndex: 100010,
          '& .MuiDialog-paper': {
            borderRadius: styles.dialogBorderRadius,
            p: 1,
            m: styles.dialogMargin,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: styles.dialogTitleFontSize }}>
          Content Details
        </DialogTitle>
        <DialogContent>
          {detailsItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Title</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{detailsItem.title || detailsItem.sectionname}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Content Type</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>{detailsItem.contenttype}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>{detailsItem.status}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(detailsItem.timecreated)}</Typography>
              </Box>
              {!!detailsItem.timemodified && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Last Modified</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(detailsItem.timemodified)}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: styles.dialogActionsPadding }}>
          <Button
            onClick={() => setDetailsDialog({ open: false, contentId: null })}
            color="primary"
            variant="contained"
            sx={{ minHeight: styles.buttonMinHeight }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RightColumn;