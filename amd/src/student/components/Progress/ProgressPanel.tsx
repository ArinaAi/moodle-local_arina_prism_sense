import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { mockProgress } from '../../mockData';

const ProgressPanel: React.FC = () => {
    // Custom Donut Chart using CSS conic-gradient
    const percentage = mockProgress.percent;

    return (
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 4 }}>Progress</Typography>

            {/* Percentage Donut */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, position: 'relative' }}>
                <Box sx={{
                    width: 160,
                    height: 160,
                    borderRadius: '50%',
                    background: `conic-gradient(#0b57d0 ${percentage}%, #f0f4f9 ${percentage}%)`, // Using bg color for track or lighter grey
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: 140, // Creating the hole
                        height: 140,
                        borderRadius: '50%',
                        background: 'white'
                    }
                }}>
                    <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1f1f1f' }}>
                            {percentage}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {mockProgress.completedItems} of {mockProgress.totalItems}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Typography align="center" variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                {mockProgress.completedItems} of {mockProgress.totalItems} Complete
            </Typography>
            <Typography align="center" variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                Keep going! You&apos;re making great progress.
            </Typography>

            {/* Filter Chips */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4 }}>
                <Chip label="All" color="primary" clickable sx={{ fontWeight: 500 }} />
                <Chip label="Incomplete" variant="outlined" clickable sx={{ bgcolor: '#f8f9fa', border: 'none' }} />
                <Chip label="Complete" variant="outlined" clickable sx={{ bgcolor: '#f8f9fa', border: 'none' }} />
            </Box>

            {/* Stats List */}
            <Box sx={{ mb: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                    <Typography variant="body2" fontWeight={600}>{mockProgress.percent}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Time Spent</Typography>
                    <Typography variant="body2" fontWeight={600}>{mockProgress.timeSpent}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Estimated Remaining</Typography>
                    <Typography variant="body2" fontWeight={600}>{mockProgress.estimatedRemaining}</Typography>
                </Box>
            </Box>

            {/* Chat Button */}
            <Button
                variant="contained"
                startIcon={<ChatBubbleOutlineIcon />}
                fullWidth
                sx={{
                    borderRadius: 8,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(11, 87, 208, 0.3)'
                }}
            >
                Ask a question
            </Button>

        </Box>
    );
};

export default ProgressPanel;
