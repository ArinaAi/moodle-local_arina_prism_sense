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
    // Add simple responsive check or just use sx breakpoints for cleaner code if possible, 
    // but conditional text rendering needs JS or display: none hacks. 
    // Let's use sx display: none for text to keep it CSS-based and SSR friendly(ish)

    return (
        <Box sx={{ p: 'clamp(12px, 3vw, 24px)', pb: 'clamp(8px, 1.5vw, 16px)', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}> {/* Added flex: 1 and minWidth: 0 to allow text truncation if needed */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />} sx={{ mb: 0.5, '& .MuiTypography-root': { fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', fontWeight: 500 } }}>
                    <Typography color="text.secondary">Course Materials</Typography>
                    <Typography color="text.secondary">Topic</Typography>
                </Breadcrumbs>
                <Typography variant="h5" sx={{
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#1a1c1e',
                    fontSize: 'clamp(1rem, 3.5vw, 1.35rem)', // Reduced from 1.1rem / 1.5rem
                    lineHeight: 1.2
                }}>
                    {selectedContent?.title || 'Course Overview'}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', mt: 0.5 }}> {/* Aligned items to top to match title */}
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
                        borderRadius: '20px', // More pill-shaped
                        fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                        minWidth: { xs: '36px', sm: 'auto' }, // Allow becoming a circle/square on mobile
                        px: { xs: 1, sm: 2 },
                        bgcolor: selectedContent.isCompleted ? '#22c55e' : 'transparent',
                        borderColor: selectedContent.isCompleted ? '#22c55e' : 'rgba(0,0,0,0.12)',
                        color: selectedContent.isCompleted ? 'white' : '#64748b',
                        boxShadow: selectedContent.isCompleted ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none',
                        '&:hover': {
                            bgcolor: selectedContent.isCompleted ? '#16a34a' : 'rgba(0,0,0,0.04)',
                            borderColor: selectedContent.isCompleted ? '#16a34a' : '#64748b',
                            color: selectedContent.isCompleted ? 'white' : '#1e293b'
                        },
                        '& .MuiButton-startIcon': {
                            mr: { xs: 0, sm: 1 },
                            ml: { xs: 0, sm: -0.5 }
                        }
                    }}
                >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {selectedContent.isCompleted ? "Completed" : "Mark complete"}
                    </Box>
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
