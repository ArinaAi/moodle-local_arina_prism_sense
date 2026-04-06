import React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  IconButton,
} from '@mui/material';
import { Add, Check, Delete, Refresh, Close, Error as ErrorIcon } from '@mui/icons-material';
import { FileText } from 'lucide-react';
import { DebouncedTextField } from '../../Core/DebouncedTextField';
import { formatFileSize } from '../../../utils/helpers';
import type { BoxState } from '../../../hooks/useSourcesUpload';

interface SourceUploadBoxProps {
  box: BoxState;
  boxIndex: number;
  retryingBoxes: Set<number>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, boxIndex: number) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>, boxIndex: number) => void;
  handleRemovePendingBox: (boxIndex: number) => void;
  handleRetryUpload: (boxIndex: number, sourceId: number) => void;
  handleDeleteIconClick: (boxIndex: number, sourceId: number) => void;
  removeErrorBox: (boxIndex: number) => void;
  handleRetryFailedUpload: (boxIndex: number, box: BoxState) => void;
  handleTitleChange: (boxIndex: number, value: string) => void;
  handleAuthorChange: (boxIndex: number, value: string) => void;
  getTextFieldError: (boxIndex: number, value: string) => boolean;
  getTextFieldHelperText: (boxIndex: number, value: string, field: string) => string;
  getTextFieldInputProps: (isExisting: boolean) => any;
  getBoxTypeFlags: (type: BoxState['type']) => any;
  getBorderColor: (type: BoxState['type'], status?: 'uploaded' | 'processing' | 'failed') => string;
  getBackgroundColor: (type: BoxState['type'], status?: 'uploaded' | 'processing' | 'failed') => string;
  truncateFilename: (name: string) => string;
}

export const SourceUploadBox = React.memo<SourceUploadBoxProps>(({
  box,
  boxIndex,
  retryingBoxes,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileSelect,
  handleRemovePendingBox,
  handleRetryUpload,
  handleDeleteIconClick,
  removeErrorBox,
  handleRetryFailedUpload,
  handleTitleChange,
  handleAuthorChange,
  getTextFieldError,
  getTextFieldHelperText,
  getTextFieldInputProps,
  getBoxTypeFlags,
  getBorderColor,
  getBackgroundColor,
  truncateFilename,
}) => {
  const { isUploading, isExisting, isError, isEmpty, isPending } = getBoxTypeFlags(box.type);
  const borderColor = getBorderColor(box.type, box.processingStatus);
  const backgroundColor = getBackgroundColor(box.type, box.processingStatus);
  const boxId = `source-upload-slot-${boxIndex + 1}`;

  return (
    <Box key={boxId} sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
      {/* DropZone Area */}
      <Paper
        variant="outlined"
        sx={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 2,
          p: 'clamp(16px, 2vh, 24px)',
          textAlign: 'center',
          backgroundColor: backgroundColor,
          cursor: isEmpty ? 'pointer' : 'default',
          minHeight: 'clamp(180px, 30vh, 320px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.3s ease',
          '&:hover': isEmpty ? {
            borderColor: '#0D5CA2',
            backgroundColor: '#f0f7ff',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(13, 92, 162, 0.15)',
          } : {},
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e: React.DragEvent) => isEmpty && handleDrop(e, boxIndex)}
        onClick={() => isEmpty && document.getElementById(`pdf-upload-input-${boxIndex}`)?.click()}
      >
        <input
          id={`pdf-upload-input-${boxIndex}`}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileSelect(e, boxIndex)}
          disabled={!isEmpty}
          style={{ display: 'none' }}
        />

        {isEmpty && (
          <>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(13, 92, 162, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <Add sx={{ fontSize: 24, color: '#0D5CA2' }} />
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: '#0D5CA2',
                fontWeight: 700,
                mb: 0.5,
                fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
              }}
            >
              Click to upload
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#6c757d',
                fontSize: 'clamp(0.7rem, 0.5vw + 0.6rem, 0.75rem)',
              }}
            >
              or drag and drop
            </Typography>
          </>
        )}

        {(isPending || isUploading) && box.file && (
          <>
            <FileText size={40} color="#0D5CA2" style={{ marginBottom: 12, opacity: 0.8 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                color: '#1a1a1a',
                textAlign: 'center',
                px: 1,
                fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
                wordBreak: 'break-word',
              }}
            >
              {truncateFilename(box.file.name)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6c757d', mb: 1, display: 'block' }}>
              {formatFileSize(box.file.size)}
            </Typography>

            {isUploading && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  marginTop: 1,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(13, 92, 162, 0.1)',
                }}
              >
                <CircularProgress size={10} thickness={4} sx={{ color: '#0D5CA2' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#0D5CA2', fontSize: 'clamp(0.65rem, 0.5vw + 0.5rem, 0.7rem)' }}>
                  Uploading...
                </Typography>
              </Box>
            )}

            {isPending && (
              <Button
                size="small"
                color="error"
                sx={{ mt: 1, minWidth: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePendingBox(boxIndex);
                }}
              >
                Remove
              </Button>
            )}
          </>
        )}

        {isExisting && box.existingSource && (
          <>
            {box.processingStatus === 'processing' && (
              <>
                <Box sx={{ position: 'relative', mb: 1.5 }}>
                  <FileText size={40} color="#0D5CA2" style={{ opacity: 0.7 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '2px solid #0D5CA2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress size={11} thickness={5} sx={{ color: '#0D5CA2' }} />
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    color: '#1a1a1a',
                    textAlign: 'center',
                    px: 1,
                    fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
                    wordBreak: 'break-word',
                  }}
                >
                  {truncateFilename(box.existingSource.filename)}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.4,
                    mt: 0.5,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(13, 92, 162, 0.1)',
                    border: '1px solid rgba(13, 92, 162, 0.2)',
                  }}
                >
                  <CircularProgress size={9} thickness={5} sx={{ color: '#0D5CA2' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#0D5CA2', fontSize: '0.68rem' }}>
                    Processing…
                  </Typography>
                </Box>
                <IconButton
                  disabled
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'rgba(0,0,0,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </>
            )}

            {box.processingStatus === 'failed' && (
              <>
                <Box sx={{ position: 'relative', mb: 1.5 }}>
                  <FileText size={40} color="#dc3545" style={{ opacity: 0.8 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#dc3545',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 10, color: '#ffffff' }} />
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    color: '#1a1a1a',
                    textAlign: 'center',
                    px: 1,
                    fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
                    wordBreak: 'break-word',
                  }}
                >
                  {truncateFilename(box.existingSource.filename)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#dc3545', textAlign: 'center', display: 'block', px: 1, mt: 0.5, lineHeight: 1.4, fontSize: '0.7rem' }}>
                  Processing failed.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                  {box.existingSource.upload_id && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={retryingBoxes.has(boxIndex)}
                      startIcon={retryingBoxes.has(boxIndex) ? <CircularProgress size={12} thickness={5} sx={{ color: '#0D5CA2' }} /> : <Refresh fontSize="small" />}
                      onClick={() => handleRetryUpload(boxIndex, box.existingSource!.id)}
                      sx={{ fontSize: '0.7rem', borderColor: '#0D5CA2', color: '#0D5CA2', '&:hover': { borderColor: '#0a4a87', backgroundColor: 'rgba(13,92,162,0.06)' }, '&.Mui-disabled': { opacity: 0.6 }, textTransform: 'none', minWidth: 0, px: 1.5, py: 0.5 }}
                    >
                      {retryingBoxes.has(boxIndex) ? 'Retrying…' : 'Retry'}
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={retryingBoxes.has(boxIndex)}
                    startIcon={<Delete fontSize="small" />}
                    onClick={() => handleDeleteIconClick(boxIndex, box.existingSource!.id)}
                    sx={{ fontSize: '0.7rem', borderColor: '#dc3545', color: '#dc3545', '&:hover': { borderColor: '#bd2130', backgroundColor: 'rgba(220,53,69,0.06)' }, '&.Mui-disabled': { opacity: 0.4 }, textTransform: 'none', minWidth: 0, px: 1.5, py: 0.5 }}
                  >
                    Delete
                  </Button>
                </Box>
              </>
            )}

            {(box.processingStatus === 'uploaded' || !box.processingStatus) && (
              <>
                <Box sx={{ position: 'relative', mb: 1.5 }}>
                  <FileText size={40} color="#28a745" style={{ opacity: 0.9 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                    }}
                  >
                    <Check sx={{ fontSize: 10, color: '#ffffff' }} />
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    color: '#1a1a1a',
                    textAlign: 'center',
                    px: 1,
                    fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
                    wordBreak: 'break-word',
                  }}
                >
                  {truncateFilename(box.existingSource.filename)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6c757d', mb: 1 }}>
                  {formatFileSize(box.existingSource.filesize)}
                </Typography>
                {box.existingSource.is_scanned === 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                    <Box sx={{ background: 'linear-gradient(135deg, #f8f8f8 0%, #ececec 100%)', color: '#666', border: '1px solid #ddd', borderRadius: '12px', padding: '1px 6px', fontSize: '0.6rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Scanned
                    </Box>
                  </Box>
                )}
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteIconClick(boxIndex, box.existingSource!.id);
                  }}
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, color: '#dc3545', backgroundColor: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: '#fff', color: '#bd2130' } }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </>
            )}
          </>
        )}

        {isError && box.file && (
          <>
            <Box sx={{ position: 'relative', mb: 1.5 }}>
              <FileText size={40} color="#dc3545" style={{ opacity: 0.9 }} />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: '#dc3545',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                }}
              >
                <ErrorIcon sx={{ fontSize: 10, color: '#ffffff' }} />
              </Box>
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, mb: 0.5, color: '#1a1a1a', textAlign: 'center', fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)' }}
            >
              {truncateFilename(box.file.name)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#dc3545', mb: 1, textAlign: 'center', lineHeight: 1.3, display: 'block', px: 1 }}>
              {box.error || 'Upload failed'}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              sx={{ mt: 1, minWidth: 80 }}
              onClick={(e) => {
                e.stopPropagation();
                handleRetryFailedUpload(boxIndex, box);
              }}
            >
              Retry
            </Button>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                removeErrorBox(boxIndex);
              }}
              size="small"
              sx={{ position: 'absolute', top: 8, right: 8, color: '#dc3545', backgroundColor: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: '#fff' } }}
            >
              <Close fontSize="small" />
            </IconButton>
          </>
        )}
      </Paper>

      {/* Inputs Area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <DebouncedTextField
          size="small"
          label="Title"
          placeholder="Title"
          fullWidth
          value={box.title}
          onChange={(e) => handleTitleChange(boxIndex, e.target.value)}
          disabled={isUploading || isExisting}
          error={getTextFieldError(boxIndex, box.title)}
          helperText={getTextFieldHelperText(boxIndex, box.title, 'Title')}
          InputProps={getTextFieldInputProps(isExisting)}
        />
        <DebouncedTextField
          size="small"
          label="Author"
          placeholder="Author"
          fullWidth
          value={box.author}
          onChange={(e) => handleAuthorChange(boxIndex, e.target.value)}
          disabled={isUploading || isExisting}
          error={getTextFieldError(boxIndex, box.author)}
          helperText={getTextFieldHelperText(boxIndex, box.author, 'Author')}
          InputProps={getTextFieldInputProps(isExisting)}
        />
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the specific box object reference changes,
  // or if its specific retrying status changes.
  return (
    prevProps.box === nextProps.box &&
    prevProps.retryingBoxes.has(prevProps.boxIndex) === nextProps.retryingBoxes.has(nextProps.boxIndex)
  );
});

SourceUploadBox.displayName = 'SourceUploadBox';
