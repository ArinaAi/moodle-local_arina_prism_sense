// types/feedback.ts
import { CurriculumTopic } from './app';

/**
 * Feedback category identifiers
 */
export type FeedbackCategoryId =
  | 'topics_need_depth'
  | 'topics_overexplained'
  | 'curriculum_mismatch'
  | 'missing_subtopics'
  | 'confusing_flow';

/**
 * Checkbox state for feedback categories
 */
export interface FeedbackCategoryState {
  id: FeedbackCategoryId;
  label: string;
  icon: string;
  checked: boolean;
}

/**
 * Complete feedback data structure sent to backend
 */
export interface ContentFeedbackData {
  // Topics that need more detailed explanation (selected from TOC)
  topicsNeedingDepth: string[];

  // Topics that are over-explained and can be simplified (selected from TOC)
  topicsOverExplained: string[];

  // Topics with content unrelated to curriculum (selected from TOC)
  extraTopics: string[];

  // Missing subtopics (user-entered)
  missingSubtopics: string[];

  // Reordered topic flow (full list if changed, empty if not)
  reorderedTopicFlow: string[];

  // Which categories were selected (for analytics)
  selectedCategories: FeedbackCategoryId[];
}

/**
 * TOC Response from API
 */
export interface TOCResponse {
  status: 'success' | 'error';
  toc: {
    status: string;
    curriculum_structure: CurriculumTopic[];
  } | null;
  error?: string;
}

/**
 * Props for the redesigned FeedbackModal
 */
export interface ContentFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: ContentFeedbackData) => void;
  contentId: number | null;
  /** User's current available credit balance */
  availableBalance: number;
  /** Video length for credit calculation ('5', '15', or '30') */
  videoLength: string;
}

/**
 * Initial empty feedback state
 */
export const createEmptyFeedbackData = (): ContentFeedbackData => ({
  topicsNeedingDepth: [],
  topicsOverExplained: [],
  extraTopics: [],
  missingSubtopics: [],
  reorderedTopicFlow: [],
  selectedCategories: [],
});

/**
 * Feedback categories configuration
 */
export const FEEDBACK_CATEGORIES: Omit<FeedbackCategoryState, 'checked'>[] = [
  {
    id: 'topics_need_depth',
    label: 'Topics need deeper explanation',
    icon: 'MenuBook',
  },
  {
    id: 'topics_overexplained',
    label: 'Topics explained more than required',
    icon: 'Compress',
  },
  {
    id: 'curriculum_mismatch',
    label: 'Content does not match curriculum',
    icon: 'Warning',
  },
  {
    id: 'missing_subtopics',
    label: 'Missing important subtopics',
    icon: 'LibraryBooks',
  },
  {
    id: 'confusing_flow',
    label: 'Concept flow is confusing',
    icon: 'Shuffle',
  },
];
