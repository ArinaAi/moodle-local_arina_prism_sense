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
  Skeleton,
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
  Checkbox,
  FormControlLabel,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, Error as ErrorIcon, Add, Check, Delete, InfoOutlined } from '@mui/icons-material';
import { FileText } from 'lucide-react';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';
import { formatFileSize } from '../../utils/helpers';
import type { MoodleContext } from '../../types/moodle';

interface SourcesModalProps {
  open: boolean;
  onClose: () => void;
  moodleContext: MoodleContext;
  refreshCredits: () => void;
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
  is_scanned?: number | null;
  processing_status?: 'uploaded' | 'processing' | 'failed';
}

interface BoxState {
  type: 'empty' | 'existing' | 'uploading' | 'success' | 'error' | 'pending_details';
  existingSource?: ExistingSource;
  file?: File;
  error?: string;
  title: string;
  author: string;
  isScanned: boolean;
  /** Only set for 'existing' boxes; mirrors existingSource.processing_status */
  processingStatus?: 'uploaded' | 'processing' | 'failed';
}

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

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<[BoxState, BoxState, BoxState]>([
    { type: 'empty', title: '', author: '', isScanned: false },
    { type: 'empty', title: '', author: '', isScanned: false },
    { type: 'empty', title: '', author: '', isScanned: false },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(true);
  const [sectionSources, setSectionSources] = useState<Record<number, ExistingSource[]>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; boxIndex: number | null; sourceId: number | null }>({ open: false, boxIndex: null, sourceId: null });

  // ── Polling ────────────────────────────────────────────────────────────────
  // Start a 60-second poll when the modal is open and at least one box is
  // still 'processing'. Stops automatically when all resolve or modal closes.
  useEffect(() => {
    if (!open || !moodleContext || selectedSection === null) { return; }

    const hasProcessing = boxes.some(
      (b) => b.type === 'existing' && b.processingStatus === 'processing'
    );
    if (!hasProcessing) { return; }

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(
          `${moodleContext.wwwroot}/local/lecturebot/api/poll_processing_status.php` +
          `?courseid=${moodleContext.courseid}&sectionid=${selectedSection}`,
          { method: 'GET', credentials: 'include' }
        );
        const data: { success: boolean; statuses: Record<string, string> } = await res.json();
        if (!data.success || !data.statuses) { return; }

        setBoxes((prevBoxes) => {
          let changed = false;
          const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
          prevBoxes.forEach((box, idx) => {
            if (box.type !== 'existing' || !box.existingSource) { return; }
            const newStatus = data.statuses[String(box.existingSource.id)] as
              | 'uploaded' | 'processing' | 'failed'
              | undefined;
            if (newStatus && newStatus !== box.processingStatus) {
              newBoxes[idx] = { ...box, processingStatus: newStatus };
              changed = true;
            }
          });
          return changed ? newBoxes : prevBoxes;
        });
      } catch {
        // Network error — skip tick, try again next interval.
      }
    }, 60000);

    return () => clearInterval(intervalId);
    // Re-run when boxes change so we stop polling once everything resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moodleContext, selectedSection, boxes]);

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
      console.error('Error loading sections:', err);
      setErrors({ general: 'Failed to load sections. Please try again.' });

    } finally {
      setLoading(false);
    }
  };

  const loadSectionSources = (sectionId: number) => {
    const sources = sectionSources[sectionId] || [];
    const newBoxes: [BoxState, BoxState, BoxState] = [
      { type: 'empty', title: '', author: '', isScanned: false },
      { type: 'empty', title: '', author: '', isScanned: false },
      { type: 'empty', title: '', author: '', isScanned: false },
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
          isScanned: false,
          processingStatus: source.processing_status ?? 'uploaded',
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

  const handleScannedChange = (boxIndex: number, checked: boolean) => {
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { ...boxes[boxIndex], isScanned: checked };
    setBoxes(newBoxes);
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

  const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB in bytes

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

    if (pdfFiles[0].size > MAX_PDF_SIZE) {
      setErrors((prev) => ({ ...prev, file: 'File size must be less than 3MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: '' }));

    // Add file to specific box
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = {
      ...boxes[boxIndex],
      type: 'pending_details',
      file: pdfFiles[0],
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

    if (pdfFiles[0].size > MAX_PDF_SIZE) {
      setErrors((prev) => ({ ...prev, file: 'File size must be less than 3MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: '' }));

    // Add file to specific box
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = {
      ...boxes[boxIndex],
      type: 'pending_details',
      file: pdfFiles[0],
    };
    setBoxes(newBoxes);
  };

  const handleUploadFailures = (failures: Array<{ filename: string; index: number; error: string }>, filesToUpload: { box: BoxState; index: number }[]) => {
    setBoxes((prevBoxes) => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      failures.forEach((failure) => {
        const uploadedItem = filesToUpload[failure.index];
        if (uploadedItem) {
          newBoxes[uploadedItem.index] = {
            type: 'error',
            file: uploadedItem.box.file,
            error: failure.error,
            title: uploadedItem.box.title,
            author: uploadedItem.box.author,
            isScanned: uploadedItem.box.isScanned,
          };
        }
      });
      return newBoxes;
    });
  };

  const reloadSourcesAfterUpload = async () => {
    await loadSections();
    if (selectedSection === null) { return };

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
      loadSectionSources(selectedSection);
    }
  };

  const uploadFiles = async (filesToUpload: { box: BoxState; index: number }[]) => {
    if (!selectedSection || filesToUpload.length === 0) {
      return;
    }

    try {
      const formData = new FormData();

      // Add all files and metadata as arrays
      filesToUpload.forEach(({ box }) => {
        if (box.file) {
          formData.append('pdf[]', box.file);
          formData.append('title[]', box.title);
          formData.append('author[]', box.author);
          formData.append('is_photograph[]', box.isScanned ? 'true' : 'false');
        }
      });

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

      // Handle partial failures
      if (data.failures && data.failures.length > 0) {
        handleUploadFailures(data.failures, filesToUpload);
        return data;
      }

      // Only reload sources when ALL uploads succeeded
      await reloadSourcesAfterUpload();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      const displayError = errorMessage.includes('API key')
        ? 'API key is missing or incorrect. Please check your settings.'
        : 'Upload failed. Please try again.';

      // Mark all files as errored
      setBoxes((prevBoxes) => {
        const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
        filesToUpload.forEach(({ box, index }) => {
          newBoxes[index] = {
            type: 'error',
            file: box.file,
            error: displayError,
            title: box.title,
            author: box.author,
            isScanned: box.isScanned,
          };
        });
        return newBoxes;
      });
      throw error;
    }
  };

  // Called when user clicks the delete icon.
  // No pre-check API call needed — delete eligibility is driven entirely by local processingStatus.
  const handleDeleteIconClick = (boxIndex: number, sourceId: number) => {
    setErrors((prev) => ({ ...prev, deleteBlocked: '', general: '' }));
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
      newBoxes[boxIndex] = { type: 'empty', title: '', author: '', isScanned: false };
      setBoxes(newBoxes);

      // Update section sources
      setSectionSources((prev) => ({
        ...prev,
        [selectedSection]: (prev[selectedSection] || []).filter((s) => s.id !== sourceId),
      }));

      // Close confirmation dialog and clear any previous error
      setErrors((prev) => ({ ...prev, general: '' }));
      closeDeleteConfirmation();
    } catch (error) {
      console.error('Error deleting source:', error);
      // Keep the dialog open so the user can retry; show the error in the modal's error banner
      setErrors((prev) => ({ ...prev, general: 'Failed to delete source. Please check your connection and try again.' }));
    }
  };

  const removeErrorBox = (boxIndex: number) => {
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { type: 'empty', title: '', author: '', isScanned: false };
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

  const handleDoneClick = async () => {
    if (!validatePendingBoxes()) {
      return;
    }

    // Filter for pending boxes BEFORE marking as uploading
    const boxesToUpload = boxes
      .map((box, index) => ({ box, index }))
      .filter(({ box }) => box.type === 'pending_details' && box.file);

    if (boxesToUpload.length === 0) {
      onClose();
      return;
    }

    // Now mark them as uploading
    markBoxesAsUploading();

    try {
      const result = await uploadFiles(boxesToUpload);

      if (result && result.failures && result.failures.length > 0) {
        // Partial failures — stay open so user can retry
        setErrors({ general: `${result.failures.length} file(s) failed to upload. Please retry.` });
      } else {
        // All succeeded — close immediately. The modal will show Processing state on next open.
        refreshCredits();
        onClose();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setErrors({ general: 'Some files failed to upload. Please try again.' });
      // Don't close — let user see error and retry
    }
  };

  const handleSectionChange = (sectionId: number) => {
    setSelectedSection(sectionId);
  };

  const getFilledBoxCount = () => {
    return boxes.filter(box => box.type === 'existing' || box.type === 'uploading').length;
  };

  const isAnyUploading = boxes.some(box => box.type === 'uploading');

  // Calculate credit label and colors based on scanned/unscanned files
  const getCreditBadgeProps = () => {
    const hasScanned = boxes.some((box) => (box.type === 'pending_details' || box.type === 'uploading') && box.isScanned);
    const hasUnscanned = boxes.some((box) => (box.type === 'pending_details' || box.type === 'uploading') && !box.isScanned);

    if (hasScanned && hasUnscanned) {
      return { label: 'Up to 0.30 Credits / Page', isOrange: true };
    } else if (hasScanned) {
      return { label: '0.30 Credits / Page', isOrange: true };
    } else if (hasUnscanned) {
      return { label: '0.20 Credits / Page', isOrange: false };
    }
    // Default when no files are pending/uploading
    return { label: '0.20 Credits / Page', isOrange: false };
  };

  const badgeProps = getCreditBadgeProps();

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant={styles.titleVariant} component="h2" sx={{ fontWeight: 600 }}>
              Manage Sources
            </Typography>
            <Chip
              label={badgeProps.label}
              size="small"
              sx={{
                bgcolor: badgeProps.isOrange ? 'rgba(249, 115, 22, 0.1)' : 'rgba(15, 108, 191, 0.1)',
                color: badgeProps.isOrange ? '#f97316' : '#0f6cbf',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: badgeProps.isOrange ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid rgba(15, 108, 191, 0.2)'
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
                {boxes.map((box, boxIndex) => {
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
                              <>
                                <Button
                                  size="small"
                                  color="error"
                                  sx={{ mt: 1, minWidth: 'auto' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
                                    newBoxes[boxIndex] = { type: 'empty', title: '', author: '', isScanned: false };
                                    setBoxes(newBoxes);
                                  }}
                                >
                                  Remove
                                </Button>

                                {/* Scanned PDF Indicator */}
                                <Box
                                  sx={{
                                    mt: 1.5,
                                  }}
                                >
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={box.isScanned}
                                        onChange={(e) => handleScannedChange(boxIndex, e.target.checked)}
                                        disabled={isUploading}
                                        size="small"
                                        sx={{
                                          padding: '4px',
                                          color: 'rgba(0, 0, 0, 0.4)',
                                          '&.Mui-checked': {
                                            color: '#0D5CA2',
                                          },
                                          '&.Mui-disabled': {
                                            color: 'rgba(0, 0, 0, 0.26)',
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontSize: '0.8125rem',
                                            color: isUploading ? 'text.disabled' : 'text.secondary',
                                          }}
                                        >
                                          Scanned document (0.30 Credits/Page)
                                        </Typography>
                                        <Tooltip
                                          title="Check this if the PDF is a scanned/photographed document. Digital PDFs have selectable text."
                                          arrow
                                          placement="top"
                                          PopperProps={{
                                            sx: {
                                              zIndex: 100002,
                                            },
                                          }}
                                        >
                                          <InfoOutlined
                                            sx={{
                                              fontSize: 14,
                                              color: 'text.disabled',
                                              cursor: 'help',
                                              '&:hover': !isUploading ? {
                                                color: 'text.secondary',
                                              } : undefined,
                                            }}
                                          />
                                        </Tooltip>
                                      </Box>
                                    }
                                    sx={{
                                      margin: 0,
                                      userSelect: 'none',
                                      '& .MuiFormControlLabel-label': {
                                        marginTop: '1px',
                                      },
                                    }}
                                  />
                                </Box>
                              </>
                            )}
                          </>
                        )}

                        {isExisting && box.existingSource && (
                          <>
                            {/* ── PROCESSING state ── */}
                            {box.processingStatus === 'processing' && (
                              <>
                                <Box sx={{ position: 'relative', mb: 1.5 }}>
                                  <FileText size={40} color="#0D5CA2" style={{ opacity: 0.7 }} />
                                  {/* Spinner overlay badge */}
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
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: '#0D5CA2', fontSize: '0.68rem' }}
                                  >
                                    Processing…
                                  </Typography>
                                </Box>
                                {/* Delete button — disabled while processing */}
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

                            {/* ── FAILED state ── */}
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
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: '#dc3545',
                                    textAlign: 'center',
                                    display: 'block',
                                    px: 1,
                                    mt: 0.5,
                                    lineHeight: 1.4,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  Processing failed. Please delete and re-upload.
                                </Typography>
                                {/* Delete button — enabled for failed state */}
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteIconClick(boxIndex, box.existingSource!.id);
                                  }}
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    color: '#dc3545',
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    '&:hover': { backgroundColor: '#fff', color: '#bd2130' },
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </>
                            )}

                            {/* ── UPLOADED (default) state ── */}
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

                                {/* Scanned Badge - Centered Below */}
                                {box.existingSource.is_scanned === 1 && (
                                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                    <Box
                                      sx={{
                                        background: 'linear-gradient(135deg, #f8f8f8 0%, #ececec 100%)',
                                        color: '#666',
                                        border: '1px solid #ddd',
                                        borderRadius: '12px',
                                        padding: '1px 6px',
                                        fontSize: '0.6rem',
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px',
                                      }}
                                    >
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
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    color: '#dc3545',
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    '&:hover': { backgroundColor: '#fff', color: '#bd2130' },
                                  }}
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
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                color: '#1a1a1a',
                                textAlign: 'center',
                                fontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.85rem)',
                              }}
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Mark as uploading
                                setBoxes((prevBoxes) => {
                                  const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
                                  newBoxes[boxIndex] = { ...box, type: 'uploading' };
                                  return newBoxes;
                                });

                                // Retry upload
                                try {
                                  await uploadFiles([{ box, index: boxIndex }]);
                                } catch (error) {
                                  console.error('Retry failed:', error);
                                }
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
              // Pop-in animation
              '@keyframes popIn': {
                '0%': { opacity: 0, transform: 'scale(0.95)' },
                '100%': { opacity: 1, transform: 'scale(1)' },
              },
              animation: 'popIn 0.2s cubic-bezier(0, 0, 0.2, 1) both',
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
