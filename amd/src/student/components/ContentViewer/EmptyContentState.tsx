import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

const EmptyContentState: React.FC = () => {
    return (
        <Paper elevation={0} sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            borderRadius: 1,
            bgcolor: 'white',
            border: '1px solid rgba(0,0,0,0.06)'
        }}>
            <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: '#f0f4f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3
            }}>
                <ZoomInIcon sx={{ fontSize: 40, color: '#94a3b8' }} /> {/* Placeholder for 'Content' icon */}
            </Box>
            <Typography variant="h6" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>
                Select content to view
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, textAlign: 'center' }}>
                Choose a slide deck or video from the course material list on the left to start learning.
            </Typography>
        </Paper>
    );
};

export default EmptyContentState;
