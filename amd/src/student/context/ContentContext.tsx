import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ContentItem } from '../mockData';

interface ContentContextType {
    selectedContent: ContentItem | null;
    setSelectedContent: (content: ContentItem) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

    const value = React.useMemo(() => ({
        selectedContent,
        setSelectedContent
    }), [selectedContent]);

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
