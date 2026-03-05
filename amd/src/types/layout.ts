import type { AppState, AppAction } from './app';

export interface LayoutProps {
    state: AppState;
    dispatch?: React.Dispatch<AppAction>; // Made optional for cases where it's not strictly needed by all children
    onOpenSourcesModal: () => void;
    onOpenCurriculumModal: () => void;
    onOpenVideoModal: () => void;
    onApproveSlides: () => void;
    onClosePreview?: () => void;
    onOpenFeedbackModal: () => void;
    onPublishContent: (contentId: string) => void;
    onUnpublishContent: (contentId: string) => void;
    onClearAllContent: () => void;
    onDeleteContent: (contentId: number) => void;
    isLoadingContent?: boolean;
    hasAnySources?: boolean;
    /** Whether the teacher has credits available (false = block generation/upload) */
    hasCredits?: boolean;
    /** Tooltip to show on disabled buttons when no credits */
    creditTooltip?: string;
    // Responsive breakpoint props
    isSmallTablet?: boolean;
    isLargeDesktop?: boolean;
}

