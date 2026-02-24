// types/app.ts
import { MoodleContext } from './moodle';

// Curriculum Types
export interface SourceFile {
  id: number;
  filename: string;
  filesize: number;
  sectionid: number;
  sectionname: string;
  is_scanned?: number | null;
  timecreated: number;
}

export interface CurriculumSubtopic {
  title: string;
  type: 'sub-topic';
}

export interface CurriculumTopic {
  title: string;
  type: 'topic';
  subtopics: CurriculumSubtopic[];
}

export interface CurriculumStructure {
  status: 'success';
  curriculum_structure: CurriculumTopic[];
}

// Slide Types
export type SlideType = 'title' | 'title_and_content' | 'comparison' | 'two_content';

export interface TitleSlideContent {
  'slide-type': 'title';
  title: string;
}

export interface TitleAndContentSlideContent {
  'slide-type': 'title_and_content';
  title: string;
  content: string[];
}

export interface ComparisonSlideContent {
  'slide-type': 'comparison';
  title: string;
  'left-content': string[];
  'right-content': string[];
}

export interface TwoContentSlideContent {
  'slide-type': 'two_content';
  title: string;
  'left-content': string[];
  'right-content': string[];
}

export type SlideContent =
  | TitleSlideContent
  | TitleAndContentSlideContent
  | ComparisonSlideContent
  | TwoContentSlideContent;

export interface SlideInfo {
  slide_content: SlideContent;
}

export interface SlideWithNotes {
  'slide-info': SlideInfo;
  'lecture-notes': string;
}

// Quiz Types
export interface MCQQuestion {
  question: string;
  type: 'mcq';
  options: string[];
  answer: number; // index of correct option
}

export interface DescriptiveQuestion {
  question: string;
  type: 'descriptive';
  options: [];
  answer: string; // expected answer text
}

export type QuizQuestion = MCQQuestion | DescriptiveQuestion;

export interface Quiz {
  questions: QuizQuestion[];
}

// Plugin Feedback Types
export interface PluginFeedbackContext {
  currentView: string;
  recentError?: string;
  deviceInfo: {
    browser: string;
    os: string;
    screenSize: string;
  };
  timestamp: number;
}

export interface PluginFeedback {
  selectedCategories: string[];
  additionalDetails: string;
  context: PluginFeedbackContext;
  attachments?: File[];
}

// Backend Response Types
export interface SubtopicResult {
  topic: string; // subtopic title
  topic_heading?: string; // parent topic title (optional for PPTX mode)
  quiz?: Quiz;
  content?: SlideWithNotes[]; // Optional - for text-based slides
  slideCount?: number; // Optional - for PPTX mode
  pptxFile?: string; // Optional - PPTX filename
  videoUrl?: string; // Optional - for Video mode
  videoDuration?: number; // Optional - in seconds
}

export interface GenerateLectureResponse {
  status: 'success' | 'error';
  results: SubtopicResult[];
  error?: string;
}

// Legacy Slide interface (for backward compatibility)
export interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  order: number;
}

// Content Item from database
export interface ContentItem {
  id: number;
  sectionid: number;
  sectionname: string;
  contenttype: string;
  status: 'generating' | 'ready' | 'error' | 'published';
  title: string | null;
  result: GenerateLectureResponse | null;
  errormessage: string | null;
  timecreated: number;
  timemodified: number;
  timepublished: number | null;
  approved: boolean;
  approvedby: number | null;
  timeapproved: number | null;
  approver: {
    id: number;
    firstname: string;
    lastname: string;
    fullname: string;
    email: string;
  } | null;
  video_length?: string;
  processing_status?: 'queued' | 'pending' | 'processing' | 'toc_generation' | 'toc_completed' | 'lecture_generation' | 'lecture_completed' | 'slides_generation' | 'slides_completed' | 'audio_completed' | 'video_completed' | null;
  generationdata?: string;
  parent_content_id?: number | null;
}

export interface AppState {
  sources: SourceFile[];
  generatedSlides: Slide[] | null;
  generatedContent: GenerateLectureResponse | null; // New comprehensive content
  currentContentId: number | null; // Track current content being viewed
  contentItems: ContentItem[]; // Content from database
  activeContentType: 'slide-deck' | 'video' | 'flashcards' | 'mind-map' | 'practice' | 'case-study';
  isGeneratingSlides: boolean;
  showSourcesModal: boolean;
  showCurriculumModal: boolean;
  showVideoLectureModal: boolean;
  showFeedbackModal: boolean;
  showPluginFeedbackModal: boolean;
  moodleContext: MoodleContext | null;
  slidesApproved: boolean;
}

export type AppAction =
  | { type: 'SET_SOURCES'; payload: SourceFile[] }
  | { type: 'ADD_SOURCE'; payload: SourceFile }
  | { type: 'REMOVE_SOURCE'; payload: number }
  | { type: 'SET_GENERATED_SLIDES'; payload: Slide[] | null }
  | { type: 'SET_GENERATED_CONTENT'; payload: GenerateLectureResponse | null }
  | { type: 'SET_CURRENT_CONTENT_ID'; payload: number | null }
  | { type: 'SET_CONTENT_ITEMS'; payload: ContentItem[] }
  | { type: 'SET_ACTIVE_CONTENT_TYPE'; payload: AppState['activeContentType'] }
  | { type: 'SET_GENERATING_SLIDES'; payload: boolean }
  | { type: 'SHOW_SOURCES_MODAL'; payload: boolean }
  | { type: 'SHOW_CURRICULUM_MODAL'; payload: boolean }
  | { type: 'SHOW_VIDEO_LECTURE_MODAL'; payload: boolean }
  | { type: 'SHOW_FEEDBACK_MODAL'; payload: boolean }
  | { type: 'SHOW_PLUGIN_FEEDBACK_MODAL'; payload: boolean }
  | { type: 'SET_MOODLE_CONTEXT'; payload: MoodleContext | null }
  | { type: 'SET_SLIDES_APPROVED'; payload: boolean };
