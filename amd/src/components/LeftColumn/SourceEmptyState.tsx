import React from 'react';
import { Box, Typography } from '@mui/material';
import { FileUp } from 'lucide-react';

const SourceEmptyState: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1,
                px: 'clamp(8px, 3vw, 24px)', // Fluid horizontal padding
                py: 'clamp(12px, 4vh, 32px)', // Fluid vertical padding
            }}
        >
            <Box
                sx={{
                    // Fluid icon container sizing
                    width: 'clamp(48px, 10vmin, 64px)',
                    height: 'clamp(48px, 10vmin, 64px)',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 'clamp(8px, 2vh, 16px)',
                    // Scale the icon inside
                    '& svg': {
                        width: 'clamp(20px, 5vmin, 28px)',
                        height: 'clamp(20px, 5vmin, 28px)',
                    },
                }}
            >
                <FileUp size={28} color="#2563eb" strokeWidth={2} />
            </Box>
            <Typography 
                variant="body1" 
                sx={{ 
                    fontWeight: 600, 
                    color: 'text.primary', 
                    mb: 'clamp(4px, 1vh, 8px)',
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                }}
            >
                Upload PDFs by Section
            </Typography>
            <Typography 
                variant="body2" 
                sx={{ 
                    color: 'text.secondary', 
                    mb: 'clamp(8px, 2vh, 16px)',
                    fontSize: 'clamp(0.75rem, 1.8vw, 0.875rem)',
                    lineHeight: 1.4,
                }}
            >
                Click &quot;Manage Sources&quot; to upload 1-3 PDFs per section
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                    color: 'text.secondary', 
                    fontStyle: 'italic',
                    fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                }}
            >
                Sources are organized by course sections
            </Typography>
        </Box>
    );
};

export default SourceEmptyState;
