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
import { Delete } from '@mui/icons-material';

import type { ContentItem } from '../../types/app';
import GeneratedContentList from './GeneratedContentList';
import PublishedContentList from './PublishedContentList';

interface RightColumnProps {
  state: {
    contentItems: ContentItem[];
  };
  onPublishContent: (contentId: string) => void;
  onClearAll?: () => void;
  onDeleteContent?: (contentId: number) => void;
  isMobile?: boolean;
  isLoading?: boolean;
  onPreviewContent?: (contentId: number) => void;
}

// Helper function for responsive styles (moved outside to reduce complexity)
const getResponsiveStyles = (isMobile: boolean, isSmallScreen: boolean) => ({
  containerGap: isMobile ? 1.5 : 2,
  containerHeight: isMobile ? 'auto' : '100%',
  menuOrigin: {
    vertical: 'bottom' as const,
    horizontal: isMobile ? 'center' as const : 'right' as const,
  },
  menuMinWidth: isMobile ? '200px' : '180px',
  menuItemPy: isMobile ? 2 : 1.5,
  menuItemMinHeight: isMobile ? '48px' : 'auto',
  dialogBorderRadius: isSmallScreen ? 0 : '20px',
  dialogMargin: isSmallScreen ? 0 : 2,
  dialogTitleFontSize: isMobile ? '1.1rem' : '1.25rem',
  dialogActionsPadding: isMobile ? 2 : 1,
  buttonMinHeight: isMobile ? '44px' : 'auto',
});

const RightColumn: React.FC<RightColumnProps> = ({
  state,
  onPublishContent,
  onClearAll,
  onDeleteContent,
  isMobile = false,
  isLoading = false,
  onPreviewContent
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Use external helper function
  const styles = getResponsiveStyles(isMobile, isSmallScreen);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; contentId: number | null }>({
    open: false,
    contentId: null,
  });
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement | null; contentId: number | null }>({
    element: null,
    contentId: null,
  });

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



  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: styles.containerGap,
          height: styles.containerHeight,
          maxWidth: '100%',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Generated Content Card */}
        <GeneratedContentList
          contentItems={state.contentItems}
          isLoading={isLoading}
          onPublish={onPublishContent}
          onMenuOpen={handleMenuOpen}
          isMobile={isMobile}
          onPreviewContent={onPreviewContent}
        />

        {/* Published Content Card */}
        <PublishedContentList
          contentItems={state.contentItems}
          isMobile={isMobile}
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
    </>
  );
};

export default RightColumn;