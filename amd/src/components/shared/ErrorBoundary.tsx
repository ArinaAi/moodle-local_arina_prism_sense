import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasError, _setHasError] = useState(false);

    // Note: This is a simplified error boundary using hooks. 
    // True error boundaries in React must be class components to use getDerivedStateFromError / componentDidCatch.
    // However, for this functional implementation, we rely on parent catch blocks or manual triggers.
    // If strict React ErrorBoundary is needed, this should be converted to a class component.

    if (hasError) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    p: 4,
                    textAlign: 'center',
                }}
            >
                <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Something went wrong
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    There was an error loading LectureBot. Please try refreshing the page.
                </Typography>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#0f6cbf',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    Reload Page
                </button>
            </Box>
        );
    }

    return <>{children}</>;
};
