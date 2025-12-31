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

  const handlePreview = (contentId: number) => {
    if (onPreviewContent) {
      onPreviewContent(contentId);
    }
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
        <GeneratedContentList
          contentItems={state.contentItems}
          isLoading={isLoading}
          onPreview={handlePreview}
          onPublish={onPublishContent}
          onMenuOpen={handleMenuOpen}
          isMobile={isMobile}
        />

        {/* Published Content Card */}
        <PublishedContentList
          contentItems={state.contentItems}
          onPreview={handlePreview}
          isMobile={isMobile}
        />
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchor.element}
        open={Boolean(menuAnchor.element)}
        onClose={handleMenuClose}
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
          onClick={handleDeleteClick}
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
      </Menu>

      {/* Clear All Confirmation Dialog */}
      <Dialog
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
      </Dialog>

      {/* Delete Content Confirmation Dialog */}
      <Dialog
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
            Are you sure you want to delete this content? This action cannot be undone.
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
      </Dialog>
    </>
  );
};

export default RightColumn;