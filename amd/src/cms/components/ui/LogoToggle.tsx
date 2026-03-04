import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface LogoToggleProps {
    onCollapse: () => void;
}

// PRISM "P" mark — shows when sidebar is collapsed.
// On hover, cross-fades to ChevronRight to hint at expand action.
export const LogoToggle: React.FC<LogoToggleProps> = ({ onCollapse }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.button
            onClick={onCollapse}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            whileTap={{ scale: 0.93 }}
            style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f6cbf 0%, #084C86 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(15,108,191,0.3)',
            }}
            title="Expand PRISM panel"
        >
            {/* PRISM "P" mark — visible at rest */}
            <motion.span
                animate={{ opacity: hovered ? 0 : 1, scale: hovered ? 0.5 : 1 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1.0625rem',
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    letterSpacing: '-0.02em',
                    userSelect: 'none',
                    lineHeight: 1,
                }}
            >
                P
            </motion.span>

            {/* Expand arrow — fades in on hover */}
            <motion.div
                animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.5 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <ChevronRight size={18} color="#fff" />
            </motion.div>
        </motion.button>
    );
};
