// ── Animation Presets (Blueprint §6) ─────────────────────────
// Centralized animation constants for Framer Motion

export const spring = {
    snappy: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 1 },
    smooth: { type: 'spring' as const, stiffness: 300, damping: 28, mass: 1 },
    gentle: { type: 'spring' as const, stiffness: 200, damping: 24, mass: 1 },
    bouncy: { type: 'spring' as const, stiffness: 400, damping: 15, mass: 0.8 },
};

export const tween = {
    micro: { duration: 0.12, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
    fast: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
    medium: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

// Stagger presets — wrapped in Variants shape for motion parent
export const stagger = {
    cards: {
        initial: {},
        animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    },
    rows: {
        initial: {},
        animate: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
    },
};

// Reusable variant factories
export const fadeInUp = {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
};

export const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};
