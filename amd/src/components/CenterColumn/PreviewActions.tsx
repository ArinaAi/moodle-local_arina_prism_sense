import React from 'react';
import { Stack, Button, Box } from '@mui/material';
import { Check, Refresh, Download } from '@mui/icons-material';
import type { ContentItem } from '../../types/app';

interface PreviewActionsProps {
    isApproved: boolean;
    onApprove: () => void;
    onRegenerate: () => void;
    onDownload: () => void;
    currentContentItem?: ContentItem;
    isMobile?: boolean;
}

// Helper to get responsive styles (moved outside component to reduce complexity)
const getResponsiveStyles = (isMobile: boolean) => ({
    stack: {
        direction: isMobile ? 'column' as const : 'row' as const,
        spacing: isMobile ? 1.5 : 2,
        mt: isMobile ? 2 : 3,
    },
    button: {
        fontWeight: 600,
        fontSize: isMobile ? '0.875rem' : '1rem',
        py: isMobile ? 1 : 1.5,
        minHeight: isMobile ? '44px' : 'auto',
        transition: 'all 0.3s ease',
    },
    outlinedHover: {
        borderWidth: 1,
        backgroundColor: 'rgba(15, 108, 191, 0.08)',
        transform: 'translateY(-2px)',
    },
});

// Helper to get approve button styles (moved outside component)
const getApproveButtonStyles = (isApproved: boolean) => ({
    border: isApproved ? 'none' : '1px solid #28A745',
    color: isApproved ? '#fff' : '#28A745',
    '&:hover': {
        borderWidth: isApproved ? 0 : 1,
        backgroundColor: isApproved ? undefined : '#dff5e4ff',
        transform: isApproved ? 'none' : 'translateY(-2px)',
        borderColor: '#28A745',
    },
    '&.Mui-disabled': {
        backgroundColor: '#28A745',
        color: '#fff',
        opacity: 0.9,
    },
});

// Helper to determine label (moved outside component)
const getApproveLabel = (isApproved: boolean, isVideo: boolean): string => {
    if (isApproved) { return 'Approved'; }
    if (isVideo) { return 'Approve Video'; }
    return 'Approve Slides';
};

// Sparkle keyframe styles (static, defined once)
const sparkleStyles = {
    base: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        width: 4,
        height: 4,
        background: '#FFD700',
        borderRadius: '50%',
    },
    keyframes: {
        '@keyframes sparkle-0': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, -20px) scale(0)' } },
        '@keyframes sparkle-1': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, -20px) scale(0)' } },
        '@keyframes sparkle-2': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, 20px) scale(0)' } },
        '@keyframes sparkle-3': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, 20px) scale(0)' } },
        '@keyframes sparkle-4': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, -30px) scale(0)' } },
        '@keyframes sparkle-5': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, 30px) scale(0)' } },
    },
};

const PreviewActions: React.FC<PreviewActionsProps> = ({
    isApproved,
    onApprove,
    onRegenerate,
    onDownload,
    currentContentItem,
    isMobile = false,
}) => {
    const isVideo = currentContentItem?.contenttype === 'video';
    const showRegenerate = !currentContentItem || currentContentItem.status !== 'published';

    // Use external helper functions
    const styles = getResponsiveStyles(isMobile);
    const approveStyles = getApproveButtonStyles(isApproved);
    const approveLabel = getApproveLabel(isApproved, isVideo ?? false);

    return (
        <Stack
            direction={styles.stack.direction}
            spacing={styles.stack.spacing}
            sx={{ mt: styles.stack.mt }}
        >
            <Button
                variant={isApproved ? 'contained' : 'outlined'}
                color={isApproved ? 'success' : 'primary'}
                startIcon={<Check />}
                onClick={onApprove}
                disabled={isApproved}
                fullWidth={isMobile}
                sx={{ ...styles.button, ...approveStyles }}
            >
                {approveLabel}
                <Box
                    className={isApproved ? "animate-pop" : ""}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -50%)',
                        overflow: 'hidden',
                        display: isApproved ? 'block' : 'none',
                    }}
                >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Box
                            key={i}
                            sx={{
                                ...sparkleStyles.base,
                                animation: `sparkle-${i} 0.6s ease-out forwards`,
                                ...sparkleStyles.keyframes,
                            }}
                        />
                    ))}
                </Box>
            </Button>

            {showRegenerate && (
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<Refresh />}
                    onClick={onRegenerate}
                    fullWidth={isMobile}
                    sx={{ ...styles.button, borderWidth: 1, '&:hover': styles.outlinedHover }}
                >
                    Regenerate
                </Button>
            )}

            <Button
                variant="outlined"
                color="primary"
                startIcon={<Download />}
                onClick={onDownload}
                fullWidth={isMobile}
                sx={{ ...styles.button, borderWidth: 1, '&:hover': styles.outlinedHover }}
            >
                Download
            </Button>
        </Stack>
    );
};

export default PreviewActions;
