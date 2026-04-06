// components/modals/SourcesModal.tsx - Section-Based Upload with 3-Box Grid
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Skeleton,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import type { MoodleContext } from '../../types/moodle';

import { ConfirmDialog } from '../Core/ConfirmDialog';
import { SourceUploadBox } from './Sources/SourceUploadBox';


interface SourcesModalProps {
  open: boolean;
  onClose: () => void;
  moodleContext: MoodleContext;
  refreshCredits: () => void;
}

import { useSourcesUpload, BoxState } from '../../hooks/useSourcesUpload';

// Helper function to get border color based on box type
const getBorderColor = (
  boxType: BoxState['type'],
  processingStatus?: 'uploaded' | 'processing' | 'failed'
): string => {
  if (boxType === 'error') {
    return '#dc3545';
  }
  if (boxType === 'existing') {
    if (processingStatus === 'processing') { return '#0D5CA2'; }
    if (processingStatus === 'failed') { return '#dc3545 '; }
    return '#28a745';
  }
  if (boxType === 'uploading' || boxType === 'pending_details') {
    return '#0D5CA2';
  }
  return '#cbd5e0';
};

// Helper function to get background color based on box type
const getBackgroundColor = (
  boxType: BoxState['type'],
  processingStatus?: 'uploaded' | 'processing' | 'failed'
): string => {
  if (boxType === 'existing') {
    if (processingStatus === 'processing') { return '#f0f7ff'; }
    if (processingStatus === 'failed') { return '#fff5f5'; }
    return '#f0fff4';
  }
  if (boxType === 'error') {
    return '#fff5f5';
  }
  if (boxType === 'uploading' || boxType === 'pending_details') {
    return '#f0f7ff';
  }
  return '#fafbfc';
};

// Helper function to get box state flags
const getBoxTypeFlags = (boxType: BoxState['type']) => ({
  isUploading: boxType === 'uploading',
  isExisting: boxType === 'existing',
  isError: boxType === 'error',
  isEmpty: boxType === 'empty',
  isPending: boxType === 'pending_details',
});

// Compose all styles
const getModalStyles = (isMobile: boolean) => {
  const baseBoxStyles = getModalBoxStyles(isMobile, { sm: '85%', md: '850px' }, '85vh');
  const layoutStyles = getModalLayoutStyles(isMobile);

  return {
    modal: baseBoxStyles,
    ...layoutStyles,
    // Add specific properties for SourcesModal
    gridGap: 'clamp(16px, 2vh, 24px)',
  };
};

const SourcesModal: React.FC<SourcesModalProps> = ({ open, onClose, moodleContext, refreshCredits }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use external helper function
  const styles = getModalStyles(isMobile);

  const {
    sections,
    selectedSection,
    boxes,
    errors,
    setErrors,
    loading,
    deleteConfirmation,
    retryingBoxes,
    isDeleting,
    isAnyUploading,
    getFilledBoxCount,
    handleSectionChange,
    handleDoneClick,
    handleTitleChange,
    handleAuthorChange,
    getTextFieldError,
    getTextFieldHelperText,
    getTextFieldInputProps,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemovePendingBox,
    handleRetryUpload,
    handleDeleteSource,
    handleDeleteIconClick,
    closeDeleteConfirmation,
    removeErrorBox,
    truncateFilename,
    handleRetryFailedUpload,
  } = useSourcesUpload(open, onClose, moodleContext, refreshCredits);
  return (
    <Modal
      open={open}
      onClose={isAnyUploading ? undefined : onClose}
      disableEscapeKeyDown={isAnyUploading}
      sx={{ zIndex: 100001 }}
    >
      <Box
        sx={{
          ...styles.modal,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: styles.padding,
            borderBottom: '2px solid #ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            // Never shrink header
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant={styles.titleVariant} component="h2" sx={{ fontWeight: 600 }}>
              Manage Sources
            </Typography>
            <Chip
              label="0.20 credits/page (text-based)"
              size="small"
              sx={{
                bgcolor: 'rgba(15, 108, 191, 0.1)',
                color: '#0f6cbf',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid rgba(15, 108, 191, 0.2)',
              }}
            />
            <Chip
              label="0.30 credits/page (scanned)"
              size="small"
              sx={{
                bgcolor: 'rgba(15, 108, 191, 0.1)',
                color: '#0f6cbf',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid rgba(15, 108, 191, 0.2)',
              }}
            />
          </Box>
          <IconButton
            onClick={onClose}
            disabled={isAnyUploading}
            sx={{
              ...styles.touchTarget,
              ...(isAnyUploading && { opacity: 0.3, cursor: 'not-allowed' }),
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Content - scrollable area */}
        <Box sx={{
          p: styles.padding,
          overflow: 'auto',
          flex: 1,
          // IMPORTANT: allows this flex child to shrink below its content size
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
        }}>
          {loading && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: styles.gridGap,
                mb: 3,
                pt: 1, // Add slight padding to match the non-loading state
              }}
            >
              {[1, 2, 3].map((item) => (
                <Box key={`skeleton-box-${item}`} sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
                  {/* DropZone Area Skeleton */}
                  <Paper
                    variant="outlined"
                    sx={{
                      border: '2px dashed #e2e8f0',
                      borderRadius: 2,
                      p: 'clamp(16px, 2vh, 24px)',
                      backgroundColor: '#fafbfc',
                      minHeight: 'clamp(180px, 30vh, 320px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 1 - (item * 0.15) // Staggered opacity effect
                    }}
                  >
                    <Skeleton variant="circular" width={48} height={48} animation="wave" sx={{ mb: 1.5 }} />
                    <Skeleton variant="text" width={100} height={20} animation="wave" sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width={120} height={16} animation="wave" />
                  </Paper>

                  {/* Inputs Area Skeleton */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Skeleton variant="rounded" width="100%" height={40} animation="wave" sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width="100%" height={40} animation="wave" sx={{ borderRadius: 1 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {!loading && errors.general && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors((prev) => ({ ...prev, general: '' }))}>
              {errors.general}
            </Alert>
          )}

          {!loading && errors.file && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors((prev) => ({ ...prev, file: '' }))}>
              {errors.file}
            </Alert>
          )}

          {!loading && sections.length === 0 && (
            <Alert severity="warning">
              No sections found in this course. Please create a section first.
            </Alert>
          )}

          {!loading && sections.length > 0 && (
            <>
              {/* 3 Upload Boxes Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: styles.gridGap,
                  mb: 3,
                }}
              >
                {boxes.map((box, boxIndex) => (
                  <SourceUploadBox
                    key={`source-upload-slot-${boxIndex + 1}`}
                    box={box}
                    boxIndex={boxIndex}
                    retryingBoxes={retryingBoxes}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    handleFileSelect={handleFileSelect}
                    handleRemovePendingBox={handleRemovePendingBox}
                    handleRetryUpload={handleRetryUpload}
                    handleDeleteIconClick={handleDeleteIconClick}
                    removeErrorBox={removeErrorBox}
                    handleRetryFailedUpload={handleRetryFailedUpload}
                    handleTitleChange={handleTitleChange}
                    handleAuthorChange={handleAuthorChange}
                    getTextFieldError={getTextFieldError}
                    getTextFieldHelperText={getTextFieldHelperText}
                    getTextFieldInputProps={getTextFieldInputProps}
                    getBoxTypeFlags={getBoxTypeFlags}
                    getBorderColor={getBorderColor}
                    getBackgroundColor={getBackgroundColor}
                    truncateFilename={truncateFilename}
                  />
                ))}
              </Box>



              {/* Progress Bar and Source Limit */}
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    height: '8px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    mb: 1.5,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(getFilledBoxCount() / 3) * 100}%`,
                      background: 'linear-gradient(90deg, #0f6cbf 0%, #0a5a9d 100%)',
                      transition: 'width 0.4s ease',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(15, 108, 191, 0.3)',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 600, fontSize: '13px' }}>
                    Source Limit
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0D5CA2', fontWeight: 700, fontSize: '14px' }}>
                    {getFilledBoxCount()}/3
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Footer with Section Dropdown */}
        <Box
          sx={{
            // Fluid padding: min 12px, max 24px
            p: 'clamp(12px, 2vh, 24px)',
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            // IMPORTANT: Never shrink footer - keeps it visible even when content is tall
            flexShrink: 0,
            // Stack vertically on mobile, row on desktop (breakpoint needed for layout switch)
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            // Fluid gap: min 8px, max 16px
            gap: 'clamp(8px, 1vh + 4px, 16px)',
            // Safe area for devices with home indicator, combined with fluid padding
            paddingBottom: 'max(clamp(12px, 2vh, 24px), env(safe-area-inset-bottom))',
          }}
        >
          {/* Section Selector - smaller on mobile */}
          <FormControl
            sx={{
              // Full width on mobile, fixed width on larger screens
              minWidth: { xs: '100%', sm: 200, md: 300 },
              width: { xs: '100%', sm: 'auto' },
            }}
            // Use small size on mobile for compact height
            size={isMobile ? 'small' : 'medium'}
          >
            <InputLabel
              id="section-selector-label"
              sx={{
                // Fluid font size
                fontSize: 'clamp(0.8rem, 0.5vw + 0.75rem, 0.875rem)',
              }}
            >
              Select Topic
            </InputLabel>
            <Select
              labelId="section-selector-label"
              value={selectedSection?.toString() || ''}
              label="Select Topic"
              onChange={(e) => handleSectionChange(Number(e.target.value))}
              disabled={loading || isAnyUploading}
              MenuProps={{
                sx: {
                  zIndex: 100002,
                },
              }}
            >
              {sections.map((section) => (
                <MenuItem key={section.sectionId} value={section.sectionId.toString()}>
                  {section.sectionName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            onClick={handleDoneClick}
            disabled={isAnyUploading}
            variant="contained"
            // Full width on mobile since footer is stacked
            fullWidth={isMobile}
            // Smaller button on mobile
            size={isMobile ? 'medium' : 'large'}
            sx={{
              fontWeight: 600,
              // Reduced vertical padding on mobile
              py: { xs: 1, sm: 1.5 },
              px: { xs: 3, sm: 4 },
              // Smaller minimum height on mobile (44px is still touch-friendly)
              minHeight: { xs: '44px', sm: 'auto' },
              background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Upload
          </Button>
        </Box>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirmation.open}
          title="Delete PDF Source?"
          description="Are you sure you want to delete this PDF source? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isConfirming={isDeleting}
          onConfirm={handleDeleteSource}
          onCancel={closeDeleteConfirmation}
        />
      </Box>
    </Modal>
  );
};

export default SourcesModal;
