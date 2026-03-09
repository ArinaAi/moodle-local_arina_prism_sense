import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Settings } from 'lucide-react';

interface EmptyStateProps {
    onOpenSourcesModal?: () => void;
    hasCredits?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onOpenSourcesModal, hasCredits = true }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: 'clamp(300px, 40vh, 400px)',
                height: '100%',
                px: 'clamp(16px, 3vw, 24px)',
            }}
        >
            <Box
                sx={{
                    width: 'clamp(56px, 6vw, 70px)',
                    height: 'clamp(56px, 6vw, 70px)',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(13, 92, 162, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 'clamp(16px, 2.5vw, 24px)',
                }}
            >
                <Settings size={28} style={{ width: 'clamp(28px, 3vw, 36px)', height: 'clamp(28px, 3vw, 36px)' }} color="#0D5CA2" />
            </Box>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    mb: 'clamp(12px, 1.5vw, 16px)',
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                }}
            >
                Get Started with PRISM Sense
            </Typography>
            <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                    mb: 'clamp(16px, 2vw, 24px)',
                    maxWidth: 400,
                    fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                }}
            >
                Upload your PDF sources to begin generating lecture content
            </Typography>
            {onOpenSourcesModal && (
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Settings size={18} style={{ width: 'clamp(18px, 1.5vw, 20px)', height: 'clamp(18px, 1.5vw, 20px)' }} />}
                    onClick={onOpenSourcesModal}
                    disabled={!hasCredits}
                    sx={{
                        py: 'clamp(8px, 1.25vw, 12px)',
                        px: 'clamp(24px, 3vw, 32px)',
                        fontWeight: 600,
                        borderRadius: '20px',
                        fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
                        minHeight: 'clamp(44px, 5vw, 48px)',
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

