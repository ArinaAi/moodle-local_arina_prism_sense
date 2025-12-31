import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Settings } from 'lucide-react';

interface EmptyStateProps {
    onOpenSourcesModal?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onOpenSourcesModal }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '400px',
                height: '100%',
            }}
        >
            <Box
                sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(13, 92, 162, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                }}
            >
                <Settings size={36} color="#0D5CA2" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Get Started with LectureBot
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, fontSize: '0.75rem' }}>
                Upload your PDF sources to begin generating lecture content
            </Typography>
            {onOpenSourcesModal && (
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Settings size={20} />}
                    onClick={onOpenSourcesModal}
                    sx={{
                        py: 1.5,
                        px: 4,
                        fontWeight: 600,
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                            boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
                            transform: 'translateY(-2px)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                        },
                    }}
                >
                    Manage Sources
                </Button>
            )}
        </Box>
    );
};

export default EmptyState;
