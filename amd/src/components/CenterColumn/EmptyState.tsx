import React from 'react';
import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { Settings } from 'lucide-react';

interface EmptyStateProps {
    onOpenSourcesModal?: () => void;
}

// Helper functions split to reduce cognitive complexity (max 15 per function)
const getLayoutStyles = (mobile: boolean): {
    container: { minHeight: string; px: number };
    iconBox: { size: number; mb: number };
    iconSize: number;
    title: { variant: 'subtitle1' | 'h6'; mb: number; fontSize: string };
} => ({
    container: {
        minHeight: mobile ? '300px' : 'clamp(300px, 40vh, 400px)',
        px: mobile ? 2 : 3,
    },
    iconBox: {
        size: mobile ? 56 : 70,
        mb: mobile ? 2 : 3,
    },
    iconSize: mobile ? 28 : 36,
    title: {
        variant: mobile ? 'subtitle1' : 'h6',
        mb: mobile ? 1.5 : 2,
        fontSize: mobile ? '1rem' : '1.25rem',
    },
});

const getButtonStyles = (mobile: boolean): {
    description: { mb: number; fontSize: string };
    button: { size: 'medium' | 'large'; iconSize: number; py: number; px: number; fontSize: string; minHeight: string };
} => ({
    description: {
        mb: mobile ? 2 : 3,
        fontSize: mobile ? '0.75rem' : '0.875rem',
    },
    button: {
        size: mobile ? 'medium' : 'large',
        iconSize: mobile ? 18 : 20,
        py: mobile ? 1 : 1.5,
        px: mobile ? 3 : 4,
        fontSize: mobile ? '0.875rem' : '1rem',
        minHeight: mobile ? '44px' : 'auto',
    },
});

// Compose all styles
const getResponsiveStyles = (mobile: boolean) => ({
    ...getLayoutStyles(mobile),
    ...getButtonStyles(mobile),
});

const EmptyState: React.FC<EmptyStateProps> = ({ onOpenSourcesModal }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use external helper function
    const styles = getResponsiveStyles(isMobile);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: styles.container.minHeight,
                height: '100%',
                px: styles.container.px,
            }}
        >
            <Box
                sx={{
                    width: styles.iconBox.size,
                    height: styles.iconBox.size,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(13, 92, 162, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: styles.iconBox.mb,
                }}
            >
                <Settings size={styles.iconSize} color="#0D5CA2" />
            </Box>
            <Typography
                variant={styles.title.variant}
                sx={{
                    fontWeight: 700,
                    mb: styles.title.mb,
                    fontSize: styles.title.fontSize,
                }}
            >
                Get Started with LectureBot
            </Typography>
            <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                    mb: styles.description.mb,
                    maxWidth: 400,
                    fontSize: styles.description.fontSize,
                }}
            >
                Upload your PDF sources to begin generating lecture content
            </Typography>
            {onOpenSourcesModal && (
                <Button
                    variant="contained"
                    size={styles.button.size}
                    startIcon={<Settings size={styles.button.iconSize} />}
                    onClick={onOpenSourcesModal}
                    sx={{
                        py: styles.button.py,
                        px: styles.button.px,
                        fontWeight: 600,
                        borderRadius: '20px',
                        fontSize: styles.button.fontSize,
                        minHeight: styles.button.minHeight,
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

