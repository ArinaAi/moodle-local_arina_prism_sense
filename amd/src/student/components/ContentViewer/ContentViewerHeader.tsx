import React from 'react';
import { Box, Typography, Breadcrumbs, Button, IconButton } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { ContentItem } from '../../mockData';

interface ContentViewerHeaderProps {
    selectedContent: ContentItem;
    onClose: () => void;
    onMarkAsComplete: (id: number, status: boolean) => void;
}

const ContentViewerHeader: React.FC<ContentViewerHeaderProps> = ({ selectedContent, onClose, onMarkAsComplete }) => {
    return (
        <Box sx={{ p: 2.5, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />} sx={{ mb: 1, '& .MuiTypography-root': { fontSize: '0.8rem', fontWeight: 500 } }}>
                    <Typography color="text.secondary">Course Materials</Typography>
                    <Typography color="text.secondary">Topic</Typography>
                </Breadcrumbs>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#1a1c1e' }}>
                    {selectedContent?.title || 'Course Overview'}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Mark Complete Button */}
                <Button
                    variant={selectedContent.isCompleted ? "contained" : "outlined"}
                    color={selectedContent.isCompleted ? "success" : "primary"}
                    size="small"
                    onClick={() => {
                        onMarkAsComplete(selectedContent.id, !selectedContent.isCompleted);
                    }}
                    startIcon={<CheckCircleIcon />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                        bgcolor: selectedContent.isCompleted ? '#22c55e' : 'transparent',
                        borderColor: selectedContent.isCompleted ? '#22c55e' : 'rgba(0,0,0,0.12)',
                        color: selectedContent.isCompleted ? 'white' : '#64748b',
                        boxShadow: selectedContent.isCompleted ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none',
                        '&:hover': {
                            bgcolor: selectedContent.isCompleted ? '#16a34a' : 'rgba(0,0,0,0.04)',
                            borderColor: selectedContent.isCompleted ? '#16a34a' : '#64748b',
                            color: selectedContent.isCompleted ? 'white' : '#1e293b'
                        }
                    }}
                >
                    {selectedContent.isCompleted ? "Completed" : "Mark complete"}
                </Button>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: '#1e293b' } }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default ContentViewerHeader;
