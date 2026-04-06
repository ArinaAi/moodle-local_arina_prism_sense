import { useState, useEffect, useCallback } from 'react';
import type { MoodleContext } from '../types/moodle';
import type { CurriculumStructure } from '../types/app';
import { apiFetch, SessionExpiredError } from '../utils/apiFetch';

export interface SectionWithSources {
  id: number;
  name: string;
  sourceCount: number;
  curriculum?: string;
  hasCurriculum?: boolean;
  curriculumChecked: boolean;
}

export function useCurriculumData(
  open: boolean,
  onClose: () => void,
  onGenerate: (curriculum: CurriculumStructure, contentStrategy: 'standard' | 'example_driven', sectionId: number, videoLength: string) => void,
  moodleContext: MoodleContext
) {
  const [sectionsWithSources, setSectionsWithSources] = useState<SectionWithSources[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [contentStrategy, setContentStrategy] = useState<'standard' | 'example_driven'>('standard');
  const [videoLength, setVideoLength] = useState<string>('5');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [curriculumText, setCurriculumText] = useState('');

  const [addingCurriculumSectionId, setAddingCurriculumSectionId] = useState<number | null>(null);
  const [newCurriculumText, setNewCurriculumText] = useState('');
  const [isSavingCurriculum, setIsSavingCurriculum] = useState(false);
  const [saveCurriculumError, setSaveCurriculumError] = useState('');

  const loadSectionsWithSources = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch(
        `${moodleContext.wwwroot}/local/arina_prism_sense/api/get_sources.php?courseid=${moodleContext.courseid}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load sources');
      }

      const sourcesBySection: Record<number, number> = {};
      if (data.sources && Array.isArray(data.sources)) {
        data.sources.forEach((source: { sectionid: number }) => {
          sourcesBySection[source.sectionid] = (sourcesBySection[source.sectionid] || 0) + 1;
        });
      }

      const baseSections = moodleContext.sections
        .filter((section) => sourcesBySection[section.id] && sourcesBySection[section.id] > 0)
        .map((section) => ({
          id: section.id,
          name: section.name,
          sourceCount: sourcesBySection[section.id],
          hasCurriculum: false as boolean | undefined,
          curriculum: undefined as string | undefined,
          curriculumChecked: false,
        }));

      if (baseSections.length === 0) {
        throw new Error('No sections with uploaded sources found. Please upload PDFs first.');
      }

      const curriculumResults = await Promise.allSettled(
        baseSections.map((section) =>
          apiFetch(
            `${moodleContext.wwwroot}/local/arina_prism_sense/api/get_curriculum.php?courseid=${moodleContext.courseid}&sectionid=${section.id}`,
            { method: 'GET', credentials: 'include' }
          ).then((res) => res.json())
        )
      );

      const sections: SectionWithSources[] = baseSections.map((section, idx) => {
        const result = curriculumResults[idx];
        if (result.status === 'fulfilled' && result.value?.status === 'success') {
          const text: string = result.value.curriculum ?? '';
          return {
            ...section,
            hasCurriculum: text.trim().length > 0,
            curriculum: text,
            curriculumChecked: true,
          };
        }
        return { ...section, hasCurriculum: undefined, curriculumChecked: true };
      });

      setSectionsWithSources(sections);

      const firstValid = sections.find((s) => s.hasCurriculum === true);
      setSelectedSectionId(firstValid ? firstValid.id : null);
    } catch (err) {
      if (err instanceof SessionExpiredError) { return; }
      console.error('Error loading sources:', err);
      setError('Failed to load sources. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [moodleContext]);

  useEffect(() => {
    if (open && moodleContext) {
      loadSectionsWithSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, moodleContext]);

  const handlePreviewCurriculum = useCallback((sectionId: number) => {
    const section = sectionsWithSources.find((s) => s.id === sectionId);
    if (!section) { return; }
    setCurriculumText(section.curriculum || '');
    setShowCurriculum(true);
  }, [sectionsWithSources]);

  const handleOpenAddCurriculum = useCallback((e: React.MouseEvent, sectionId: number) => {
    e.stopPropagation();
    setNewCurriculumText('');
    setSaveCurriculumError('');
    setAddingCurriculumSectionId((prev) => (prev === sectionId ? null : sectionId));
  }, []);

  const handleSaveCurriculum = useCallback(async (e: React.MouseEvent, sectionId: number) => {
    e.stopPropagation();
    if (!newCurriculumText.trim()) {
      setSaveCurriculumError('Please enter curriculum content before saving.');
      return;
    }
    setIsSavingCurriculum(true);
    setSaveCurriculumError('');
    try {
      const response = await apiFetch(
        `${moodleContext.wwwroot}/local/arina_prism_sense/api/add_curriculum.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseid: moodleContext.courseid,
            sectionid: sectionId,
            curriculum_text: newCurriculumText.trim(),
          }),
        }
      );
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.error || 'Failed to save curriculum.');
      }
      setSectionsWithSources((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, hasCurriculum: true, curriculum: newCurriculumText.trim(), curriculumChecked: true }
            : s
        )
      );
      setSelectedSectionId((prev) => prev ?? sectionId);
      setAddingCurriculumSectionId(null);
      setNewCurriculumText('');
    } catch (err: any) {
      if (err instanceof SessionExpiredError) { return; }
      setSaveCurriculumError(err.message || 'Something went wrong.');
    } finally {
      setIsSavingCurriculum(false);
    }
  }, [newCurriculumText, moodleContext]);

  const handleGenerate = useCallback(() => {
    if (!selectedSectionId) {
      setError('Please select a section');
      return;
    }

    const section = sectionsWithSources.find((s) => s.id === selectedSectionId);

    const curriculum: CurriculumStructure = {
      status: 'success',
      curriculum_structure: [
        {
          title: section?.name || 'Section Content',
          type: 'topic',
          subtopics: [
            {
              title: 'Content',
              type: 'sub-topic',
            },
          ],
        },
      ],
    };

    onClose();
    onGenerate(curriculum, contentStrategy, selectedSectionId, videoLength);
  }, [selectedSectionId, sectionsWithSources, contentStrategy, videoLength, onClose, onGenerate]);

  return {
    sectionsWithSources,
    selectedSectionId,
    contentStrategy,
    videoLength,
    loading,
    error,
    showCurriculum,
    curriculumText,
    addingCurriculumSectionId,
    newCurriculumText,
    isSavingCurriculum,
    saveCurriculumError,
    
    setError,
    setSelectedSectionId,
    setContentStrategy,
    setVideoLength,
    setShowCurriculum,
    setAddingCurriculumSectionId,
    setNewCurriculumText,
    setSaveCurriculumError,

    handlePreviewCurriculum,
    handleOpenAddCurriculum,
    handleSaveCurriculum,
    handleGenerate
  };
}
