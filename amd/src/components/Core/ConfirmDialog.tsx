import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = React.memo<ConfirmDialogProps>(({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullScreen={isMobile}
      sx={{ zIndex: 100005 }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '12px',
          width: { xs: '100%', sm: '400px' },
          maxWidth: { xs: '100%', sm: '400px' },
          '@keyframes popIn': {
            '0%': { opacity: 0, transform: 'scale(0.95)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
          animation: 'popIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary' }}>
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          gap: 1,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Button
          onClick={onCancel}
          variant="outlined"
          disabled={isConfirming}
          fullWidth={isMobile}
          sx={{
            fontWeight: 600,
            borderWidth: 2,
            minHeight: { xs: '48px', sm: 'auto' },
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isConfirming}
          fullWidth={isMobile}
          startIcon={
            isConfirming ? (
              <CircularProgress size={14} thickness={5} sx={{ color: '#fff' }} />
            ) : undefined
          }
          sx={{
            fontWeight: 600,
            minHeight: { xs: '48px', sm: 'auto' },
            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #c82333 0%, #bd2130 100%)',
              boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
            },
            '&.Mui-disabled': { opacity: 0.7 },
          }}
        >
          {isConfirming ? 'Confirming…' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}, (prevProps, nextProps) => {
  if (!prevProps.open && !nextProps.open) { return true; } // stay closed
  return (
    prevProps.open === nextProps.open &&
    prevProps.isConfirming === nextProps.isConfirming &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
