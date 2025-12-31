import React from 'react';
import { Box, Typography } from '@mui/material';
import { Check } from '@mui/icons-material';

const ReadyState: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '400px',
            }}
        >
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                }}
            >
                <Check sx={{ fontSize: 40, color: '#28a745' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Ready to Generate Slides
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Your sources are uploaded and ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Click &quot;Slide Deck&quot; in the Content Dock to create your lecture
            </Typography>
        </Box>
    );
};

export default ReadyState;
