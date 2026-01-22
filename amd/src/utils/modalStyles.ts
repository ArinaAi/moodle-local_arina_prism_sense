/**
 * Shared modal styles to reduce duplication across modal components.
 */

// Common types for style objects
interface TouchTarget {
    minWidth: string;
    minHeight: string;
}

interface ModalLayoutStyles {
    padding: string | number;
    titleVariant: 'subtitle1' | 'h6';
    touchTarget: TouchTarget;
    footerPaddingBottom?: string | number;
    [key: string]: any;
}

const DEFAULT_MODAL_WIDTH = { sm: '85%', md: '750px' };

/**
 * Returns the base styles for the Modal Box component.
 * @param isMobile Boolean indicating if device is mobile
 * @param width Custom width for desktop (default: md: 750px)
 * @param maxHeight Custom max-height (default: mobile 100dvh, desktop 90vh)
 */
export const getModalBoxStyles = (
    isMobile: boolean,
    width: string | object = DEFAULT_MODAL_WIDTH,
    maxHeight: string = '90vh'
) => ({
    position: isMobile ? 'fixed' as const : 'absolute' as const,
    top: isMobile ? 0 : '50%',
    left: isMobile ? 0 : '50%',
    right: isMobile ? 0 : 'auto',
    bottom: isMobile ? 0 : 'auto',
    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
    width: isMobile ? '100%' : width,
    // Use 100dvh for proper mobile height
    maxHeight: isMobile ? '100dvh' : maxHeight,
    height: isMobile ? '100dvh' : 'auto',
    borderRadius: isMobile ? 0 : '16px',
    boxShadow: isMobile ? 'none' : 24, // Matches Sources/Video modal (Curriculum had specific shadow, can override)
    // Ensure overflow hidden for flex layout
    overflow: 'hidden',
    bgcolor: 'background.paper',
});

/**
 * Returns common layout styles like padding and touch targets.
 * Uses fluid typography and spacing where possible.
 */
export const getModalLayoutStyles = (isMobile: boolean): ModalLayoutStyles => ({
    padding: 'clamp(16px, 2vh, 24px)',
    titleVariant: isMobile ? 'subtitle1' : 'h6',
    touchTarget: {
        minWidth: isMobile ? '44px' : 'auto',
        minHeight: isMobile ? '44px' : 'auto',
    },
    // Safe area padding for bottom
    footerPaddingBottom: 'max(clamp(16px, 2vh, 24px), env(safe-area-inset-bottom))',
});
