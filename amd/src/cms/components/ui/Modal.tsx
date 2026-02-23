import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { spring, tween } from '../../config/animations';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={tween.medium}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1000,
                    }}
                />

                {/* Panel */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={spring.gentle}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 440,
                        maxWidth: '90vw',
                        background: 'var(--paper)',
                        borderRadius: 20,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                        zIndex: 1001,
                        border: '1px solid var(--border)',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: 24,
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <h3
                            style={{
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: 'var(--tp)',
                                margin: 0,
                            }}
                        >
                            {title}
                        </h3>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--ts)',
                                padding: 4,
                                borderRadius: 8,
                                display: 'flex',
                            }}
                        >
                            <X size={18} />
                        </motion.button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: 24 }}>{children}</div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);
