import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../ui/Modal';

interface CreditAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'distribute' | 'recall';
    staffName: string;
    currentBalance?: number;
}

export const CreditAllocationModal: React.FC<CreditAllocationModalProps> = ({
    isOpen,
    onClose,
    mode,
    staffName,
    currentBalance,
}) => {
    const [amount, setAmount] = useState('');
    const isRecall = mode === 'recall';
    const title = isRecall ? 'Recall Credits' : 'Distribute Credits';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Staff info */}
                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: isRecall ? 'rgba(220,53,69,0.06)' : 'rgba(15,108,191,0.06)',
                        borderLeft: `3px solid ${isRecall ? '#dc3545' : '#0f6cbf'}`,
                    }}
                >
                    <div style={{ fontSize: '0.8125rem', color: 'var(--ts)' }}>
                        {isRecall ? 'Recall from' : 'Distribute to'}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tp)' }}>
                        {staffName}
                        {currentBalance !== undefined && (
                            <span style={{ fontWeight: 400, color: 'var(--ts)', marginLeft: 8 }}>
                                (Balance: {currentBalance.toLocaleString()} cr)
                            </span>
                        )}
                    </div>
                </div>

                {/* Amount input */}
                <div>
                    <label
                        htmlFor="credit-amount"
                        style={{
                            display: 'block',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: 'var(--ts)',
                            marginBottom: 6,
                            letterSpacing: '0.04em',
                        }}
                    >
                        Amount
                    </label>
                    <input
                        id="credit-amount"
                        type="number"
                        placeholder="Enter credit amount…"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: '0.9375rem',
                            fontFamily: 'inherit',
                            color: 'var(--tp)',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0f6cbf';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,108,191,0.12)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                    <motion.button
                        whileHover={{ borderColor: 'var(--ts)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            border: '1px solid var(--border)',
                            borderRadius: 20,
                            background: 'transparent',
                            color: 'var(--tp)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={{
                            backgroundColor: '#0a5a9d',
                            y: -1,
                            boxShadow: '0 4px 12px rgba(15,108,191,0.25)',
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            border: 'none',
                            borderRadius: 20,
                            background: '#0f6cbf',
                            color: '#fff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Confirm
                    </motion.button>
                </div>
            </div>
        </Modal>
    );
};
