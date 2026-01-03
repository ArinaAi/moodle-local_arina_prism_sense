// Mock Data for Student Interface Prototype
// Matches the Figma screenshot details

export interface ContentItem {
    id: number;
    title: string;
    type: 'slide' | 'video' | 'flashcard' | 'mindmap';
    duration: string;
    isCompleted: boolean;
    progress: number;
    totalSlides?: number;
}

export interface Section {
    id: number;
    title: string;
    items: ContentItem[];
    isExpanded?: boolean;
}

export const mockSections: Section[] = [
    {
        id: 1,
        title: 'Introduction to AI',
        isExpanded: true,
        items: [
            {
                id: 101,
                title: 'What is Artificial Intelligence?',
                type: 'slide',
                duration: '15 min',
                isCompleted: true,
                progress: 100,
                totalSlides: 24
            },
            {
                id: 102,
                title: 'History of AI',
                type: 'slide', // Icon looked like a check/document
                duration: '22 min',
                isCompleted: true,
                progress: 100
            },
            {
                id: 103,
                title: 'Introduction to AI - Video Lecture',
                type: 'video',
                duration: '12 min',
                isCompleted: false,
                progress: 0
            },
            {
                id: 104,
                title: 'AI Terminology Flashcards',
                type: 'flashcard',
                duration: '10 min',
                isCompleted: false,
                progress: 75
            },
            {
                id: 105,
                title: 'AI Concepts Mind Map',
                type: 'mindmap',
                duration: '8 min',
                isCompleted: false,
                progress: 45
            }
        ]
    },
    {
        id: 2,
        title: 'Machine Learning Basics',
        isExpanded: false,
        items: [
            { id: 201, title: 'Supervised Learning', type: 'slide', duration: '20 min', isCompleted: false, progress: 0 },
            { id: 202, title: 'Unsupervised Learning', type: 'slide', duration: '18 min', isCompleted: false, progress: 0 },
            { id: 203, title: 'Reinforcement Learning', type: 'video', duration: '25 min', isCompleted: false, progress: 0 }
        ]
    },
    {
        id: 3,
        title: 'Neural Networks',
        isExpanded: false,
        items: []
    }
];

export const mockProgress = {
    percent: 17,
    completedItems: 2,
    totalItems: 12,
    timeSpent: '4.5 hrs',
    estimatedRemaining: '6.2 hrs'
};
