import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContentItem, Section } from '../mockData';
import { apiFetch, SessionExpiredError } from '../../utils/apiFetch';

interface ContentContextType {
    selectedContent: ContentItem | null;
    setSelectedContent: (content: ContentItem | null) => void;
    sections: Section[];
    isLoading: boolean;
    error: string | null;
    markAsComplete: (contentId: number, status: boolean) => Promise<void>;
    refreshContent: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

// Helper functions to reduce complexity
const updateSectionCompletion = (sections: Section[], contentId: number, status: boolean): Section[] => {
    return sections.map(sec => ({
        ...sec,
        items: sec.items.map(item =>
            item.id === contentId
                ? { ...item, isCompleted: status, progress: status ? 100 : 0 }
                : item
        )
    }));
};

const updateSelectedContentCompletion = (content: ContentItem | null, contentId: number, status: boolean): ContentItem | null => {
    if (content && content.id === contentId) {
        return { ...content, isCompleted: status, progress: status ? 100 : 0 };
    }
    return content;
};

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [sections, setSections] = useState<Section[]>([]); // Initialize empty
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use ref to track selectedContent without triggering effect loops
    const selectedContentRef = React.useRef(selectedContent);
    useEffect(() => {
        selectedContentRef.current = selectedContent;
    }, [selectedContent]);

    // Get basic config from Moodle global
    const getMoodleConfig = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const M = (window as any).M;
        const wwwroot = M?.cfg?.wwwroot || '';
        const courseId = M?.cfg?.courseId || (new URLSearchParams(window.location.search)).get('id') || 0;
        return { wwwroot, courseId };
    }, []);

    const findContentById = useCallback((sectionsList: Section[], id: number): ContentItem | undefined => {
        for (const sec of sectionsList) {
            const item = sec.items.find(i => i.id === id);
            if (item) {
                return item;
            }
        }
        return undefined;
    }, []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { wwwroot, courseId } = getMoodleConfig();
            if (!courseId) {
                throw new Error("Course ID not found");
            }

            const response = await apiFetch(`${wwwroot}/local/arina_prism_sense/api/get_student_content.php?courseid=${courseId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch content');
            }

            const data = await response.json();
            if (data.status === 'success') {
                setSections(data.sections);
                // If selectedContent is set, update it with fresh data (e.g. completion status)
                // Use Ref to avoid dependency loop
                if (selectedContentRef.current) {
                    const found = findContentById(data.sections, selectedContentRef.current.id);
                    if (found) {
                        setSelectedContent(found);
                    }
                }
            } else {
                setError(data.error || 'Unknown error');
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err instanceof SessionExpiredError) { return; }
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getMoodleConfig, findContentById]);

    const markAsComplete = useCallback(async (contentId: number, status: boolean) => {
        try {
            const { wwwroot, courseId } = getMoodleConfig();

            // Convert status to 1 or 0
            const statusInt = status ? 1 : 0;

            const response = await apiFetch(`${wwwroot}/local/arina_prism_sense/api/track_content.php?courseid=${courseId}&contentid=${contentId}&status=${statusInt}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                // Optimistic update
                setSections(prev => updateSectionCompletion(prev, contentId, status));

                if (selectedContentRef.current?.id === contentId) {
                    setSelectedContent(prev => updateSelectedContentCompletion(prev, contentId, status));
                }
            }
        } catch (err) {
            if (err instanceof SessionExpiredError) { return; }
            console.error('Failed to update completion status', err);
        }
    }, [getMoodleConfig]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const value = React.useMemo(() => ({
        selectedContent,
        setSelectedContent,
        sections,
        isLoading,
        error,
        markAsComplete,
        refreshContent: fetchContent
    }), [selectedContent, sections, isLoading, error, markAsComplete, fetchContent]);

    return (
        <ContentContext.Provider value={value}>
            {children}
        </ContentContext.Provider>
    );
};

export const useContent = () => {
    const context = useContext(ContentContext);
    if (!context) {
        throw new Error('useContent must be used within ContentProvider');
    }
    return context;
};
