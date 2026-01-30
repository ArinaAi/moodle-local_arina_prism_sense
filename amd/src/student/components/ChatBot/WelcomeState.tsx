import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface WelcomeStateProps {
    suggestedQuestions: string[];
    onQuestionClick: (question: string) => void;
}

export const WelcomeState: React.FC<WelcomeStateProps> = ({ suggestedQuestions, onQuestionClick }) => {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 3,
            py: 'clamp(24px, 4vw, 32px)'
        }}>
            <Avatar sx={{
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                width: 'clamp(48px, 10vw, 64px)',
                height: 'clamp(48px, 10vw, 64px)'
            }}>
                <AutoAwesomeIcon fontSize="large" />
            </Avatar>
            <Box sx={{ textAlign: 'center', maxWidth: '80%' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>
                    Hi! I&apos;m your AI Tutor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Ask me anything about this lecture. I&apos;m here to help you understand better!
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
                    Try asking:
                </Typography>
                {suggestedQuestions.map((question) => (
                    <Chip
                        key={question}
                        label={question}
                        onClick={() => onQuestionClick(question)}
                        sx={{
                            justifyContent: 'flex-start',
                            height: 'auto',
                            py: 'clamp(8px, 1.5vw, 12px)',
                            px: 'clamp(12px, 2vw, 16px)',
                            fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                            fontWeight: 500,
                            bgcolor: 'white',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: 'rgba(37, 99, 235, 0.04)',
                                borderColor: '#2563eb',
                                transform: 'translateX(4px)'
                            },
                            '& .MuiChip-label': {
                                whiteSpace: 'normal',
                                textAlign: 'left'
                            }
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
};
