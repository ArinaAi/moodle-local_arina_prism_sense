import type { AppState, AppAction } from '../types/app';

// Initial state
export const initialState: AppState = {
    sources: [],
    generatedSlides: null,
    generatedContent: null,
    currentContentId: null,
    curriculum: null,
    contentStrategy: 'standard',
    publishedLectures: [],
    contentItems: [],
    activeContentType: 'slide-deck',
    isGeneratingSlides: false,
    showSourcesModal: false,
    showCurriculumModal: false,
    showFeedbackModal: false,
    moodleContext: null,
    slidesApproved: false,
};

// Reducer for state management
export function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_SOURCES':
            return { ...state, sources: action.payload };
        case 'ADD_SOURCE':
            return { ...state, sources: [...state.sources, action.payload] };
        case 'REMOVE_SOURCE':
            return {
                ...state,
                sources: state.sources.filter((s) => s.id !== action.payload),
            };
        case 'SET_GENERATED_SLIDES':
            return { ...state, generatedSlides: action.payload };
        case 'SET_GENERATED_CONTENT':
            return { ...state, generatedContent: action.payload };
        case 'SET_CURRENT_CONTENT_ID':
            return { ...state, currentContentId: action.payload };
        case 'SET_CURRICULUM':
            return { ...state, curriculum: action.payload };
        case 'SET_CONTENT_STRATEGY':
            return { ...state, contentStrategy: action.payload };
        case 'SET_PUBLISHED_LECTURES':
            return { ...state, publishedLectures: action.payload };
        case 'ADD_PUBLISHED_LECTURE':
            return {
                ...state,
                publishedLectures: [...state.publishedLectures, action.payload],
            };
        case 'SET_CONTENT_ITEMS':
            // Deduplicate items based on ID to prevent UI glitches
            // const uniqueItems = Array.from(new Map(action.payload.map(item => [item.id, item])).values());
            // Actually, payload should be the source of truth, but let's log it
            // console.log('📦 Reducer: SET_CONTENT_ITEMS', action.payload.length, 'items');
            return { ...state, contentItems: action.payload };
        case 'SET_ACTIVE_CONTENT_TYPE':
            return { ...state, activeContentType: action.payload };
        case 'SET_GENERATING_SLIDES':
            return { ...state, isGeneratingSlides: action.payload };
        case 'SHOW_SOURCES_MODAL':
            return { ...state, showSourcesModal: action.payload };
        case 'SHOW_CURRICULUM_MODAL':
            return { ...state, showCurriculumModal: action.payload };
        case 'SHOW_FEEDBACK_MODAL':
            return { ...state, showFeedbackModal: action.payload };
        case 'SET_MOODLE_CONTEXT':
            return { ...state, moodleContext: action.payload };
        case 'SET_SLIDES_APPROVED':
            return { ...state, slidesApproved: action.payload };
        default:
            return state;
    }
}
