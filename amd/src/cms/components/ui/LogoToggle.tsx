import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';

interface LogoToggleProps {
    onCollapse: () => void;
}

export const LogoToggle: React.FC<LogoToggleProps> = ({ onCollapse }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.button
            onClick={onCollapse}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            whileTap={{ scale: 0.93 }}
            style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f6cbf, #3d8fd1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Zap icon — fades out on hover */}
            <motion.div
                animate={{ opacity: hovered ? 0 : 1, scale: hovered ? 0.6 : 1 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Zap size={16} color="#fff" />
            </motion.div>

            {/* ChevronRight icon — fades in on hover */}
            <motion.div
                animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <ChevronRight size={16} color="#fff" />
            </motion.div>
        </motion.button>
    );
};
