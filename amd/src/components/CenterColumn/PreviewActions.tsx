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

// Helper to get responsive styles - now using fluid clamp() values
const getResponsiveStyles = () => ({
    stack: {
        direction: 'row' as const,
        spacing: 'clamp(4px, 1vw, 12px)',
        mt: 'clamp(8px, 1.5vw, 16px)',
    },
    button: {
        fontWeight: 600,
        fontSize: 'clamp(0.65rem, 1.2vw, 0.875rem)',
        py: 'clamp(4px, 0.8vw, 8px)',
        px: 'clamp(8px, 1.5vw, 16px)',
        minHeight: 'clamp(28px, 4vw, 40px)',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap' as const,
        flex: '1 1 auto',
        minWidth: 0,
    },
    outlinedHover: {
        borderWidth: 1,
        backgroundColor: 'rgba(15, 108, 191, 0.08)',
        transform: 'translateY(-1px)',
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
    isMobile: _isMobile = false,
}) => {
    const isVideo = currentContentItem?.contenttype === 'video';
    const showRegenerate = currentContentItem?.status !== 'published' && !isApproved;

    // Use external helper functions (no longer needs isMobile)
    const styles = getResponsiveStyles();
    const approveStyles = getApproveButtonStyles(isApproved);
    const approveLabel = getApproveLabel(isApproved, isVideo ?? false);

    return (
        <Stack
            direction={styles.stack.direction}
            spacing={styles.stack.spacing}
            sx={{ mt: styles.stack.mt, flexWrap: 'wrap', gap: 'clamp(4px, 1vw, 8px)' }}
        >
            <Button
                variant={isApproved ? 'contained' : 'outlined'}
                color={isApproved ? 'success' : 'primary'}
                startIcon={<Check />}
                onClick={onApprove}
                disabled={isApproved}
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
                sx={{ ...styles.button, borderWidth: 1, '&:hover': styles.outlinedHover }}
            >
                Download
            </Button>
        </Stack>
    );
};

export default PreviewActions;
