// components/modals/SourcesModal.tsx - Section-Based Upload with 3-Box Grid
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, Error as ErrorIcon, Add, Check, Delete } from '@mui/icons-material';
import { FileText } from 'lucide-react';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import { formatFileSize } from '../../utils/helpers';
import type { MoodleContext } from '../../types/moodle';

interface SourcesModalProps {
  open: boolean;
  onClose: () => void;
  moodleContext: MoodleContext;
}

interface SectionOption {
  sectionId: number;
  sectionName: string;
}

interface ExistingSource {
  id: number;
  filename: string;
  filesize: number;
  fileitemid: number;
  timecreated: number;
  title?: string;
  author?: string;
}

interface BoxState {
  type: 'empty' | 'existing' | 'uploading' | 'success' | 'error' | 'pending_details';
  existingSource?: ExistingSource;
  file?: File;
  error?: string;
  title: string;
  author: string;
}

// Helper function to get border color based on box type
const getBorderColor = (boxType: BoxState['type']): string => {
  if (boxType === 'error') {
    return '#dc3545';
  }
  if (boxType === 'existing') {
    return '#28a745';
  }
  if (boxType === 'uploading' || boxType === 'pending_details') {
    return '#0D5CA2';
  }
  return '#cbd5e0';
};

// Helper function to get background color based on box type
const getBackgroundColor = (boxType: BoxState['type']): string => {
  if (boxType === 'existing') {
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

const SourcesModal: React.FC<SourcesModalProps> = ({ open, onClose, moodleContext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use external helper function
  const styles = getModalStyles(isMobile);

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<[BoxState, BoxState, BoxState]>([
    { type: 'empty', title: '', author: '' },
    { type: 'empty', title: '', author: '' },
    { type: 'empty', title: '', author: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(true);
  const [sectionSources, setSectionSources] = useState<Record<number, ExistingSource[]>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; boxIndex: number | null; sourceId: number | null }>({ open: false, boxIndex: null, sourceId: null });

  // Load sections when modal opens
  useEffect(() => {
    if (open && moodleContext) {
      loadSections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moodleContext]);

  // Load sources for selected section
  useEffect(() => {
    if (selectedSection !== null && sectionSources[selectedSection] !== undefined) {
      loadSectionSources(selectedSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection, sectionSources]);

  const loadSections = async () => {
    setLoading(true);
    try {
      // Get sections from moodleContext directly
      if (!moodleContext.sections || moodleContext.sections.length === 0) {
        throw new Error('No sections available in this course');
      }

      // Initialize section map and sources map
      const sectionMap = new Map<number, string>();
      const sourcesMap: Record<number, ExistingSource[]> = {};

      // Add all sections from moodleContext
      moodleContext.sections.forEach((section: { id: number; name: string }) => {
        sectionMap.set(section.id, section.name);
        sourcesMap[section.id] = [];
      });

      // Try to fetch existing sources from API
      try {
        const response = await fetch(
          `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data = await response.json();

        // Add sources if available
        if (data.sources && Array.isArray(data.sources)) {
          data.sources.forEach((source: ExistingSource & { sectionid: number }) => {
            if (!sourcesMap[source.sectionid]) {
              sourcesMap[source.sectionid] = [];
            }
            sourcesMap[source.sectionid].push(source);
          });
        }
      } catch (apiError) {
        // If API fails, just use sections without sources
        console.warn('Failed to fetch existing sources, continuing with empty sources:', apiError);
      }

      const sectionList = Array.from(sectionMap.entries()).map(([id, name]) => ({
        sectionId: id,
        sectionName: name,
      }));

      setSections(sectionList);
      setSectionSources(sourcesMap);

      // Select first section by default
      if (sectionList.length > 0) {
        setSelectedSection(sectionList[0].sectionId);
      }
    } catch (err) {
      setErrors({ general: (err as Error).message });

    } finally {
      setLoading(false);
    }
  };

  const loadSectionSources = (sectionId: number) => {
    const sources = sectionSources[sectionId] || [];
    const newBoxes: [BoxState, BoxState, BoxState] = [
      { type: 'empty', title: '', author: '' },
      { type: 'empty', title: '', author: '' },
      { type: 'empty', title: '', author: '' },
    ];

    sources.forEach((source, index) => {
      if (index < 3) {
        // Use filename (without extension) as fallback title if title is missing
        const fallbackTitle = source.title || source.filename.replace(/\.[^/.]+$/, '');

        newBoxes[index] = {
          type: 'existing',
          existingSource: source,
          title: fallbackTitle,
          author: source.author || '',
        };
      }
    });

    setBoxes(newBoxes);
  };

  const handleTitleChange = (boxIndex: number, value: string) => {
    // Limit title to 50 characters
    const truncatedValue = value.slice(0, 50);
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { ...boxes[boxIndex], title: truncatedValue };
    setBoxes(newBoxes);

    // Clear validation error when user types
    if (validationErrors[boxIndex]) {
      const newErrors = [...validationErrors];
      newErrors[boxIndex] = false;
      setValidationErrors(newErrors);
    }
  };

  const handleAuthorChange = (boxIndex: number, value: string) => {
    // Limit author to 25 characters
    const truncatedValue = value.slice(0, 25);
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { ...boxes[boxIndex], author: truncatedValue };
    setBoxes(newBoxes);

    // Clear validation error when user types
    if (validationErrors[boxIndex]) {
      const newErrors = [...validationErrors];
      newErrors[boxIndex] = false;
      setValidationErrors(newErrors);
    }
  };


  const getTextFieldError = (boxIndex: number, value: string): boolean => {
    const box = boxes[boxIndex];
    return validationErrors[boxIndex] && box.type === 'pending_details' && !value.trim();
  };

  const getTextFieldHelperText = (boxIndex: number, value: string, fieldName: string): string => {
    const box = boxes[boxIndex];
    return validationErrors[boxIndex] && box.type === 'pending_details' && !value.trim() ? `${fieldName} is required` : '';
  };

  const getTextFieldInputProps = (isExisting: boolean) => ({
    sx: {
      fontSize: 'clamp(0.85rem, 0.5vw + 0.75rem, 0.9rem)',
      bgcolor: isExisting ? '#f8f9fa' : '#fff',
      '& input': {
        color: isExisting ? '#2c3e50' : 'inherit',
        WebkitTextFillColor: isExisting ? '#2c3e50' : 'inherit'
      }
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, boxIndex: number) => {
    if (!selectedSection) {
      return;
    }

    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      setErrors((prev) => ({ ...prev, file: 'Please select PDF files only.' }));
      return;
    }

    if (pdfFiles.length > 1) {
      setErrors((prev) => ({ ...prev, file: 'Please select only 1 PDF per box.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: '' }));

    // Add file to specific box
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = {
      type: 'pending_details',
      file: pdfFiles[0],
      title: '',
      author: '',
    };
    setBoxes(newBoxes);

    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, boxIndex: number) => {
    e.preventDefault();

    if (!selectedSection) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      setErrors((prev) => ({ ...prev, file: 'Please drop PDF files only.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: '' }));

    // Add file to specific box
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = {
      type: 'pending_details',
      file: pdfFiles[0],
      title: '',
      author: '',
    };
    setBoxes(newBoxes);
  };

  const uploadFile = async (file: File, boxIndex: number, title: string, author: string, skipRefresh: boolean = false) => {
    if (!selectedSection) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', title);
      formData.append('author', author);

      const response = await fetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/upload_source.php?courseid=${moodleContext.courseid}&sectionid=${selectedSection}&sesskey=${moodleContext.sesskey}`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.error || 'Upload failed');
      }

      // If skipping refresh, we just mark this box as success temporarily or leave it as uploading until final refresh
      // But to be safe, let's mark it as 'success' type with existing source data if returned, or just keep it until refresh
      if (!skipRefresh) {
        // Reload all sources from server to ensure fresh data
        await loadSections();

        // Reload the current section's sources
        if (selectedSection !== null) {
          const sourcesResponse = await fetch(
            `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}&sectionid=${selectedSection}`,
            {
              method: 'GET',
              credentials: 'include',
            }
          );
          const sourcesData = await sourcesResponse.json();

          if (sourcesData.success && sourcesData.sources) {
            setSectionSources((prev) => ({
              ...prev,
              [selectedSection]: sourcesData.sources,
            }));

            // Reload boxes with fresh data
            loadSectionSources(selectedSection);
          }
        }
      }
    } catch (error) {
      // Update box to error state
      setBoxes((prevBoxes) => {
        const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
        newBoxes[boxIndex] = {
          type: 'error',
          file,
          error: (error as Error).message,
          title: '',
          author: '',
        };
        return newBoxes;
      });
      // Re-throw to let the caller know it failed
      throw error;
    }
  };

  const openDeleteConfirmation = (boxIndex: number, sourceId: number) => {
    setDeleteConfirmation({ open: true, boxIndex, sourceId });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({ open: false, boxIndex: null, sourceId: null });
  };

  const handleDeleteSource = async () => {
    const { boxIndex, sourceId } = deleteConfirmation;
    if (!selectedSection || boxIndex === null || sourceId === null) {
      return;
    }

    try {
      const response = await fetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/delete_source.php?courseid=${moodleContext.courseid}&sesskey=${moodleContext.sesskey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceid: sourceId }),
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.error || 'Delete failed');
      }

      // Clear the box
      const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { type: 'empty', title: '', author: '' };
      setBoxes(newBoxes);

      // Update section sources
      setSectionSources((prev) => ({
        ...prev,
        [selectedSection]: (prev[selectedSection] || []).filter((s) => s.id !== sourceId),
      }));

      // Close confirmation dialog
      closeDeleteConfirmation();
    } catch (error) {
      setErrors({ general: (error as Error).message });
      closeDeleteConfirmation();
    }
  };

  const removeErrorBox = (boxIndex: number) => {
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { type: 'empty', title: '', author: '' };
    setBoxes(newBoxes);
  };

  const truncateFilename = (filename: string, maxLength: number = 25): string => {
    if (filename.length <= maxLength) {
      return filename;
    }
    const ext = filename.slice(filename.lastIndexOf('.'));
    const name = filename.slice(0, filename.lastIndexOf('.'));
    return name.slice(0, maxLength - ext.length - 3) + '...' + ext;
  };

  // --- Helper Functions for Done Handler ---

  const validatePendingBoxes = () => {
    const newValidationErrors = boxes.map(
      box => box.type === 'pending_details' && (!box.title.trim() || !box.author.trim())
    );
    const hasInvalidPending = newValidationErrors.some(Boolean);

    if (hasInvalidPending) {
      setValidationErrors(newValidationErrors);
      setErrors({ general: 'Please provide Title and Author for all selected files.' });
      return false;
    }

    setValidationErrors([false, false, false]);
    return true;
  };

  const markBoxesAsUploading = () => {
    setBoxes((prevBoxes) => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      prevBoxes.forEach((box, idx) => {
        if (box.type === 'pending_details') {
          newBoxes[idx] = { ...box, type: 'uploading' };
        }
      });
      return newBoxes;
    });
  };

  const processUploads = async (boxesToUpload: { box: BoxState; index: number }[]) => {
    for (const { box, index } of boxesToUpload) {
      if (box.type === 'pending_details' && box.file && box.title.trim() && box.author.trim()) {
        try {
          // Pass true to skip refresh for individual uploads
          await uploadFile(box.file, index, box.title, box.author, true);
        } catch (error) {
          console.error(`Failed to upload box ${index}:`, error);
          // Loop continues to next item
        }
      }
    }
  };

  const refreshSectionSources = async () => {
    await loadSections();
    if (selectedSection !== null) {
      const sourcesResponse = await fetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}&sectionid=${selectedSection}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      const sourcesData = await sourcesResponse.json();

      if (sourcesData.success && sourcesData.sources) {
        setSectionSources((prev) => ({
          ...prev,
          [selectedSection]: sourcesData.sources,
        }));
        // This will re-render boxes with the final state from server
        loadSectionSources(selectedSection);
      }
    }
  };

  const handleDoneClick = async () => {
    if (!validatePendingBoxes()) {
      return;
    }

    markBoxesAsUploading();

    const boxesToUpload = boxes
      .map((box, index) => ({ box, index }))
      .filter(({ box }) => box.type === 'pending_details');

    if (boxesToUpload.length === 0) {
      onClose();
      return;
    }

    try {
      await processUploads(boxesToUpload);
      await refreshSectionSources();
      onClose();
    } catch (err) {
      console.error('Upload sequence interrupted:', err);
    }
  };

  const handleSectionChange = (sectionId: number) => {
    setSelectedSection(sectionId);
  };

  const getFilledBoxCount = () => {
    return boxes.filter(box => box.type === 'existing' || box.type === 'uploading').length;
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 100001 }}>
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
          <Typography variant={styles.titleVariant} component="h2" sx={{ fontWeight: 600 }}>
            Manage Sources
          </Typography>
          <IconButton
            onClick={onClose}
            sx={styles.touchTarget}
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
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
                {boxes.map((box, boxIndex) => {
                  const { isUploading, isExisting, isError, isEmpty, isPending } = getBoxTypeFlags(box.type);
                  const borderColor = getBorderColor(box.type);
                  const backgroundColor = getBackgroundColor(box.type);
                  const boxId = `source-upload-slot-${boxIndex + 1}`;

                  return (
                    <Box key={boxId} sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
                      {/* DropZone Area */}
                      <Paper
                        variant="outlined"
                        sx={{
                          border: `2px dashed ${borderColor}`,
                          borderRadius: 2,
                          // Fluid padding: 16px to 24px
                          p: 'clamp(16px, 2vh, 24px)',
                          textAlign: 'center',
                          backgroundColor: backgroundColor,
                          cursor: isEmpty ? 'pointer' : 'default',
                          // Fluid min-height: 180px to 320px
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
                        onClick={() =>
                          isEmpty && document.getElementById(`pdf-upload-input-${boxIndex}`)?.click()
                        }
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
                            <FileText
                              size={40}
                              color="#0D5CA2"
                              style={{ marginBottom: 12, opacity: 0.8 }}
                            />
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
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#6c757d',
                                mb: 1,
                                display: 'block',
                              }}
                            >
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
                                <CircularProgress
                                  size={10}
                                  thickness={4}
                                  sx={{ color: '#0D5CA2' }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, color: '#0D5CA2', fontSize: 'clamp(0.65rem, 0.5vw + 0.5rem, 0.7rem)' }}
                                >
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
                                  const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
                                  newBoxes[boxIndex] = { type: 'empty', title: '', author: '' };
                                  setBoxes(newBoxes);
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </>
                        )}

                        {isExisting && box.existingSource && (
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
                            <Typography variant="caption" sx={{ color: '#6c757d' }}>
                              {formatFileSize(box.existingSource.filesize)}
                            </Typography>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirmation(boxIndex, box.existingSource!.id);
                              }}
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: '#dc3545',
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                '&:hover': { backgroundColor: '#fff', color: '#bd2130' }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
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
                            <Typography variant="caption" sx={{ color: '#dc3545', mb: 1, textAlign: 'center', lineHeight: 1.2 }}>
                              {box.error || 'Upload failed'}
                            </Typography>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                removeErrorBox(boxIndex);
                              }}
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: '#dc3545',
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                '&:hover': { backgroundColor: '#fff' }
                              }}
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Paper>

                      {/* Inputs Area - Always Visible */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField
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
                        <TextField
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
                })}
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
              disabled={loading}
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

          {/* Done Button - more compact on mobile */}
          <Button
            onClick={handleDoneClick}
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
            Done
          </Button>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmation.open}
          onClose={closeDeleteConfirmation}
          // Full screen on mobile for better usability
          fullScreen={isMobile}
          sx={{ zIndex: 100005 }}
          PaperProps={{
            sx: {
              // Rounded corners on larger screens, square on mobile (fullScreen)
              borderRadius: isMobile ? 0 : '12px',
              // Responsive width instead of fixed minWidth
              width: { xs: '100%', sm: '400px' },
              maxWidth: { xs: '100%', sm: '400px' },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            Delete PDF Source?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'text.secondary' }}>
              Are you sure you want to delete this PDF source? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions
            sx={{
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 3 },
              gap: 1,
              // Stack buttons vertically on mobile
              flexDirection: { xs: 'column-reverse', sm: 'row' },
            }}
          >
            <Button
              onClick={closeDeleteConfirmation}
              variant="outlined"
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
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSource}
              variant="contained"
              color="error"
              fullWidth={isMobile}
              sx={{
                fontWeight: 600,
                minHeight: { xs: '48px', sm: 'auto' },
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #c82333 0%, #bd2130 100%)',
                  boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Modal>
  );
};

export default SourcesModal;
