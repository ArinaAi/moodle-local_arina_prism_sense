import { useState, useEffect } from 'react';
import type { SourceFile } from '../types/app';
import type { MoodleContext } from '../types/moodle';

declare const M: { cfg: { wwwroot: string } };

export const useSources = (moodleContext: MoodleContext | null, showSourcesModal: boolean) => {
    const [sources, setSources] = useState<SourceFile[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);

    useEffect(() => {
        const loadAllSources = async () => {
            if (!moodleContext?.courseid) {
                return;
            }

            setLoadingSources(true);
            try {
                const response = await fetch(
                    `${M.cfg.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${moodleContext.courseid}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const data = await response.json();
                if (data.success && data.sources) {
                    setSources(data.sources);
                }
            } catch (error) {
                console.error('Error loading sources:', error);
            } finally {
                setLoadingSources(false);
            }
        };

        loadAllSources();
    }, [moodleContext?.courseid, showSourcesModal]);

    return { sources, loadingSources };
};
