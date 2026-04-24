/**
 * 60fps-safe animation constants for the ArinaPrismSense plugin.
 * 
 * PERFORMANCE RULE: Only use `transform` and `opacity` in keyframes.
 * These are GPU-accelerated and will never cause layout thrashing.
 * DO NOT animate: `margin`, `padding`, `width`, `height`, `top`, `left` etc.
 */

// Easing curves
export const EASING = {
    /** Snappy and physical - good for appearing elements */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Accelerate fast, decelerate slow - good for appearing */
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Very fast - for small micro-interactions like press feedback */
    snap: 'cubic-bezier(0.2, 0, 0, 1)',
};

// MUI-compatible `sx` keyframe definitions reusable across components
export const KEYFRAMES = {
    /** 
     * Slide up from 8px below + fade in.
     * Perfect for list items and cards entering the screen.
     */
    slideUpFade: {
        '@keyframes slideUpFade': {
            '0%': { opacity: 0, transform: 'translateY(8px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
        },
    },

    /**
     * Scale from 0.95 + fade in. 
     * Perfect for modals and dialogs appearing.
     */
    popIn: {
        '@keyframes popIn': {
            '0%': { opacity: 0, transform: 'scale(0.95)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
        },
    },

    /** 
     * Fade in only (no movement). For large areas like slide images.
     */
    fadeIn: {
        '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
        },
    },
};

/**
 * Returns an sx-compatible animation property for an item at a given index in a list.
 * @param index - Position of the item in the list (0-indexed)
 * @param baseDelay - Optional base delay in seconds (default 0)
 */
export const staggeredAnimation = (index: number, baseDelay = 0) => ({
    ...KEYFRAMES.slideUpFade,
    animation: `slideUpFade 0.3s ${EASING.decelerate} both`,
    animationDelay: `${baseDelay + index * 0.05}s`,
});

/**
 * Standard card hover/active interaction styles.
 * Use the `js` spread inside `sx` props.
 */
export const CARD_INTERACTIONS = {
    transition: `transform 0.2s ${EASING.standard}, box-shadow 0.2s ${EASING.standard}`,
    '&:hover': {
        transform: 'translateY(-2px)',
    },
    '&:active': {
        transform: 'scale(0.98)',
    },
};

/**
 * Button press interaction.
 */
export const BUTTON_INTERACTIONS = {
    transition: `transform 0.15s ${EASING.snap}, box-shadow 0.15s ${EASING.snap}`,
    '&:active': {
        transform: 'scale(0.97)',
    },
};

/**
 * Modal pop-in animation for `PaperProps.sx`.
 */
export const MODAL_POP_IN = {
    ...KEYFRAMES.popIn,
    animation: `popIn 0.2s ${EASING.decelerate} both`,
};
