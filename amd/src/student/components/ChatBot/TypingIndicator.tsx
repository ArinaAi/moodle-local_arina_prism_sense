import React from 'react';
import { Box, Avatar, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export const TypingIndicator: React.FC = () => {
    return (
        <Fade in timeout={300}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{
                    bgcolor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    width: 32,
                    height: 32
                }}>
                    <AutoAwesomeIcon fontSize="small" sx={{ fontSize: 16 }} />
                </Avatar>
                <Box sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2.5,
                    borderTopLeftRadius: 0,
                    bgcolor: 'white',
                    border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    gap: 0.5
                }}>
                    {[0, 1, 2].map((dot) => (
                        <Box
                            key={dot}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: '#2563eb',
                                animation: 'bounce 1.4s infinite',
                                animationDelay: `${dot * 0.2}s`,
                                '@keyframes bounce': {
                                    '0%, 60%, 100%': { transform: 'translateY(0)' },
                                    '30%': { transform: 'translateY(-8px)' }
                                }
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Fade>
    );
};
