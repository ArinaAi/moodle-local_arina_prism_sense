import React, { useState, useEffect, useCallback } from 'react';
import type { MoodleContext } from '../types/moodle';
import { apiFetch, SessionExpiredError } from '../utils/apiFetch';

export interface ExistingSource {
  id: number;
  filename: string;
  filesize: number;
  fileitemid: number;
  timecreated: number;
  is_scanned?: number | null;
  processing_status?: 'uploaded' | 'processing' | 'failed';
  title?: string;
  author?: string;
  /** Backend upload identifier – needed for retry and delete API calls. */
  upload_id?: string | null;
}

export interface BoxState {
  type: 'empty' | 'existing' | 'pending_details' | 'uploading' | 'error';
  existingSource?: ExistingSource;
  file?: File;
  error?: string;
  title: string;
  author: string;
  processingStatus?: 'uploaded' | 'processing' | 'failed';
}

interface SectionOption {
  sectionId: number;
  sectionName: string;
}

const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB

export function useSourcesUpload(
  open: boolean,
  onClose: () => void,
  moodleContext: MoodleContext,
  refreshCredits: () => void
) {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<[BoxState, BoxState, BoxState]>([
    { type: 'empty', title: '', author: '' },
    { type: 'empty', title: '', author: '' },
    { type: 'empty', title: '', author: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [loading, setLoading] = useState(true);
  const [sectionSources, setSectionSources] = useState<Record<number, ExistingSource[]>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; boxIndex: number | null; sourceId: number | null }>({ open: false, boxIndex: null, sourceId: null });
  const [retryingBoxes, setRetryingBoxes] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !moodleContext || selectedSection === null) { return; }

    const hasProcessing = boxes.some(
      (b) => b.type === 'existing' && b.processingStatus === 'processing'
    );
    if (!hasProcessing) { return; }

    const runPoll = async () => {
      try {
        const res = await apiFetch(
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
    };

    runPoll();
    const intervalId = setInterval(runPoll, 60000);
    return () => clearInterval(intervalId);
  }, [open, moodleContext, selectedSection, boxes]);

  // Load sections when modal opens
  useEffect(() => {
    if (open && moodleContext) {
      loadSections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moodleContext]);

  useEffect(() => {
    if (selectedSection !== null && sectionSources[selectedSection] !== undefined) {
      loadSectionSources(selectedSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection]);

  const loadSections = async () => {
    setLoading(true);
    try {
      if (!moodleContext.sections || moodleContext.sections.length === 0) {
        throw new Error('No sections available in this course');
      }

      const sectionMap = new Map<number, string>();
      const sourcesMap: Record<number, ExistingSource[]> = {};

      moodleContext.sections.forEach((section: { id: number; name: string }) => {
        sectionMap.set(section.id, section.name);
        sourcesMap[section.id] = [];
      });

      try {
        const response = await apiFetch(
          `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}`,
          { method: 'GET', credentials: 'include' }
        );
        const data = await response.json();

        if (data.sources && Array.isArray(data.sources)) {
          data.sources.forEach((source: ExistingSource & { sectionid: number }) => {
            if (!sourcesMap[source.sectionid]) {
              sourcesMap[source.sectionid] = [];
            }
            sourcesMap[source.sectionid].push(source);
          });
        }
      } catch (apiError) {
        console.warn('Failed to fetch existing sources, continuing with empty sources:', apiError);
      }

      const sectionList = Array.from(sectionMap.entries()).map(([id, name]) => ({
        sectionId: id,
        sectionName: name,
      }));

      setSections(sectionList);
      setSectionSources(sourcesMap);

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
      { type: 'empty', title: '', author: '' },
      { type: 'empty', title: '', author: '' },
      { type: 'empty', title: '', author: '' },
    ];

    sources.forEach((source, index) => {
      if (index < 3) {
        const fallbackTitle = source.title || source.filename.replace(/\.[^/.]+$/, '');
        newBoxes[index] = {
          type: 'existing',
          existingSource: source,
          title: fallbackTitle,
          author: source.author || '',
          processingStatus: source.processing_status ?? 'uploaded',
        };
      }
    });
    setBoxes(newBoxes);
  };

  const handleTitleChange = useCallback((boxIndex: number, value: string) => {
    const truncatedValue = value.slice(0, 50);
    setBoxes(prevBoxes => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { ...prevBoxes[boxIndex], title: truncatedValue };
      return newBoxes;
    });
    setValidationErrors(prev => {
      if (prev[boxIndex]) {
        const newErrors = [...prev];
        newErrors[boxIndex] = false;
        return newErrors as [boolean, boolean, boolean];
      }
      return prev;
    });
  }, []);

  const handleAuthorChange = useCallback((boxIndex: number, value: string) => {
    const truncatedValue = value.slice(0, 25);
    setBoxes(prevBoxes => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { ...prevBoxes[boxIndex], author: truncatedValue };
      return newBoxes;
    });
    setValidationErrors(prev => {
      if (prev[boxIndex]) {
        const newErrors = [...prev];
        newErrors[boxIndex] = false;
        return newErrors as [boolean, boolean, boolean];
      }
      return prev;
    });
  }, []);

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

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>, boxIndex: number) => {
    if (!selectedSection) {return;}
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
    setBoxes(prevBoxes => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { ...prevBoxes[boxIndex], type: 'pending_details', file: pdfFiles[0] };
      return newBoxes;
    });
    event.target.value = '';
  }, [selectedSection]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragLeave = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = useCallback((e: React.DragEvent, boxIndex: number) => {
    e.preventDefault();
    if (!selectedSection) {return;}
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
    setBoxes(prevBoxes => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { ...prevBoxes[boxIndex], type: 'pending_details', file: pdfFiles[0] };
      return newBoxes;
    });
  }, [selectedSection]);

  const handleRemovePendingBox = useCallback((boxIndexInner: number) => {
    setBoxes(prevBoxes => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndexInner] = { type: 'empty', title: '', author: '' };
      return newBoxes;
    });
  }, []);

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
          };
        }
      });
      return newBoxes;
    });
  };

  const reloadSourcesAfterUpload = async () => {
    await loadSections();
    if (selectedSection === null) {return;}
    const sourcesResponse = await apiFetch(
      `${moodleContext.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}&sectionid=${selectedSection}`,
      { method: 'GET', credentials: 'include' }
    );
    const sourcesData = await sourcesResponse.json();
    if (sourcesData.success && sourcesData.sources) {
      setSectionSources((prev) => ({ ...prev, [selectedSection]: sourcesData.sources }));
      loadSectionSources(selectedSection);
    }
  };

  const uploadFiles = async (filesToUpload: { box: BoxState; index: number }[]) => {
    if (!selectedSection || filesToUpload.length === 0) {return;}
    try {
      const formData = new FormData();
      filesToUpload.forEach(({ box }) => {
        if (box.file) {
          formData.append('pdf[]', box.file);
          formData.append('title[]', box.title);
          formData.append('author[]', box.author);
          formData.append('is_photograph[]', 'true');
        }
      });

      const response = await apiFetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/upload_source.php?courseid=${moodleContext.courseid}&sectionid=${selectedSection}&sesskey=${moodleContext.sesskey}`,
        { method: 'POST', body: formData, credentials: 'include' }
      );
      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.failures && data.failures.length > 0) {
        handleUploadFailures(data.failures, filesToUpload);
        return data;
      }

      await reloadSourcesAfterUpload();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      const displayError = errorMessage.includes('API key')
        ? 'API key is missing or incorrect. Please check your settings.'
        : 'Upload failed. Please try again.';

      setBoxes((prevBoxes) => {
        const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
        filesToUpload.forEach(({ box, index }) => {
          newBoxes[index] = { type: 'error', file: box.file, error: displayError, title: box.title, author: box.author };
        });
        return newBoxes;
      });
      throw error;
    }
  };

  const handleDeleteIconClick = (boxIndex: number, sourceId: number) => {
    setErrors((prev) => ({ ...prev, deleteBlocked: '', general: '' }));
    setDeleteConfirmation({ open: true, boxIndex, sourceId });
  };

  const closeDeleteConfirmation = () => setDeleteConfirmation({ open: false, boxIndex: null, sourceId: null });

  const handleRetryUpload = async (boxIndex: number, sourceId: number) => {
    setErrors((prev) => ({ ...prev, general: '' }));
    setRetryingBoxes((prev) => new Set(prev).add(boxIndex));
    try {
      const response = await apiFetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/retry_source.php?courseid=${moodleContext.courseid}&sesskey=${moodleContext.sesskey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceid: sourceId }),
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (data.status !== 'success') {throw new Error(data.error || 'Retry failed');}

      setBoxes((prevBoxes) => {
        const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
        const box = newBoxes[boxIndex];
        if (box.type === 'existing') {
          newBoxes[boxIndex] = { ...box, processingStatus: 'processing' };
        }
        return newBoxes;
      });
    } catch (error) {
      if (error instanceof SessionExpiredError) {return;}
      setErrors((prev) => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Retry failed. Please try again.',
      }));
    } finally {
      setRetryingBoxes((prev) => {
        const next = new Set(prev);
        next.delete(boxIndex);
        return next;
      });
    }
  };

  const handleDeleteSource = async () => {
    const { boxIndex, sourceId } = deleteConfirmation;
    if (!selectedSection || boxIndex === null || sourceId === null) {return;}
    setIsDeleting(true);
    try {
      const response = await apiFetch(
        `${moodleContext.wwwroot}/local/lecturebot/api/delete_source.php?courseid=${moodleContext.courseid}&sesskey=${moodleContext.sesskey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceid: sourceId }),
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (data.status !== 'success') {throw new Error(data.error || 'Delete failed');}

      const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { type: 'empty', title: '', author: '' };
      setBoxes(newBoxes);

      setSectionSources((prev) => ({
        ...prev,
        [selectedSection]: (prev[selectedSection] || []).filter((s) => s.id !== sourceId),
      }));

      setErrors((prev) => ({ ...prev, general: '' }));
      closeDeleteConfirmation();
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: 'Failed to delete source. Please check your connection and try again.' }));
    } finally {
      setIsDeleting(false);
    }
  };

  const removeErrorBox = (boxIndex: number) => {
    const newBoxes = [...boxes] as [BoxState, BoxState, BoxState];
    newBoxes[boxIndex] = { type: 'empty', title: '', author: '' };
    setBoxes(newBoxes);
  };

  const truncateFilename = (filename: string, maxLength: number = 25): string => {
    if (filename.length <= maxLength) {return filename;}
    const ext = filename.slice(filename.lastIndexOf('.'));
    const name = filename.slice(0, filename.lastIndexOf('.'));
    return name.slice(0, maxLength - ext.length - 3) + '...' + ext;
  };

  const validatePendingBoxes = () => {
    const newValidationErrors = boxes.map(
      box => box.type === 'pending_details' && (!box.title.trim() || !box.author.trim())
    ) as [boolean, boolean, boolean];
    if (newValidationErrors.some(Boolean)) {
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

  const handleRetryFailedUpload = async (boxIndex: number, box: BoxState) => {
    setBoxes((prevBoxes) => {
      const newBoxes = [...prevBoxes] as [BoxState, BoxState, BoxState];
      newBoxes[boxIndex] = { ...box, type: 'uploading' };
      return newBoxes;
    });
    try {
      await uploadFiles([{ box, index: boxIndex }]);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleDoneClick = async () => {
    if (!validatePendingBoxes()) {return;}
    const boxesToUpload = boxes
      .map((box, index) => ({ box, index }))
      .filter(({ box }) => box.type === 'pending_details' && box.file);

    if (boxesToUpload.length === 0) {
      onClose();
      return;
    }

    markBoxesAsUploading();
    try {
      const result = await uploadFiles(boxesToUpload);
      if (result && result.failures && result.failures.length > 0) {
        setErrors({ general: `${result.failures.length} file(s) failed to upload. Please retry.` });
      } else {
        refreshCredits();
        onClose();
      }
    } catch (err) {
      setErrors({ general: 'Some files failed to upload. Please try again.' });
    }
  };

  const handleSectionChange = (sectionId: number) => setSelectedSection(sectionId);
  const getFilledBoxCount = () => boxes.filter(box => box.type === 'existing' || box.type === 'uploading').length;
  const isAnyUploading = boxes.some(box => box.type === 'uploading');

  return {
    sections,
    selectedSection,
    boxes,
    errors,
    setErrors,
    validationErrors,
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
  };
}
