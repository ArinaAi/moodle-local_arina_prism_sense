// hooks/useTOC.ts
import { useState, useEffect, useCallback } from 'react';
import type { CurriculumTopic } from '../types/app';

declare const M: { cfg: { wwwroot: string } };

interface UseTOCResult {
  topics: CurriculumTopic[];
  topicTitles: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch TOC (Table of Contents) data from Azure storage
 * @param contentId - The content ID to fetch TOC for
 * @param enabled - Whether to fetch (default true)
 */
export const useTOC = (contentId: number | null, enabled: boolean = true): UseTOCResult => {
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTOC = useCallback(async () => {
    if (!contentId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${M.cfg.wwwroot}/local/lecturebot/api/get_toc.php?contentid=${contentId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.status === 'success' && data.toc?.curriculum_structure) {
        setTopics(data.toc.curriculum_structure);
      } else {
        setError('Failed to load topics. Please try again.');
        setTopics([]);
      }
    } catch (err) {
      console.error('Error fetching TOC:', err);
      setError('Failed to load topics');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [contentId, enabled]);

  useEffect(() => {
    fetchTOC();
  }, [fetchTOC]);

  // Extract just the topic titles for easy access
  const topicTitles = topics.map((topic) => topic.title);

  return {
    topics,
    topicTitles,
    loading,
    error,
    refetch: fetchTOC,
  };
};
