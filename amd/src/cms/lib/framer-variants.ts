// Apple-inspired animation presets using Framer Motion
// All animations are designed for 60fps performance using GPU-accelerated properties only

export const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
};

export const springTransitionSmooth = {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
};

// Fade In Up - Entry animations
export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: springTransition,
};

// Scale on Hover - Card interactions
export const scaleOnHover = {
    rest: { scale: 1 },
    hover: {
        scale: 1.02,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
};

// Press feedback - Button interactions
export const pressScale = {
    rest: { scale: 1 },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1 }
    },
};

// Stagger children - List animations
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

// Sidebar collapse animation
export const sidebarVariants = {
    expanded: {
        width: 240,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    collapsed: {
        width: 72,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
};

// Modal/Dialog animations
export const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: springTransition,
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 },
    },
};

// Pulse animation for live data indicators
export const pulseVariants = {
    animate: {
        opacity: [0.8, 1, 0.8],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};
