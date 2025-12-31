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

const PreviewActions: React.FC<PreviewActionsProps> = ({
    isApproved,
    onApprove,
    onRegenerate,
    onDownload,
    currentContentItem,
    isMobile = false,
}) => {
    const isVideo = currentContentItem?.contenttype === 'video';

    let approveLabel = 'Approve Slides';
    if (isApproved) {
        approveLabel = 'Approved';
    } else if (isVideo) {
        approveLabel = 'Approve Video';
    }

    return (
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mt: 3 }}>
            <Button
                variant={isApproved ? 'contained' : 'outlined'}
                color={isApproved ? 'success' : 'primary'}
                startIcon={<Check />}
                onClick={onApprove}
                disabled={isApproved}
                fullWidth={isMobile}
                sx={{
                    fontWeight: 600,
                    border: isApproved ? 'none' : '1px solid #28A745',
                    color: isApproved ? '#fff' : '#28A745',
                    py: 1.5,
                    transition: 'all 0.3s ease',
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
                }}
            >
                {approveLabel}
                {/* Sparkle effects on click */}
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
                    {['sparkle-0', 'sparkle-1', 'sparkle-2', 'sparkle-3', 'sparkle-4', 'sparkle-5'].map((id, i) => (
                        <Box
                            key={id}
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: 4,
                                height: 4,
                                background: '#FFD700',
                                borderRadius: '50%',
                                animation: `sparkle-${i} 0.6s ease-out forwards`,
                                '@keyframes sparkle-0': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, -20px) scale(0)' } },
                                '@keyframes sparkle-1': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, -20px) scale(0)' } },
                                '@keyframes sparkle-2': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-20px, 20px) scale(0)' } },
                                '@keyframes sparkle-3': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(20px, 20px) scale(0)' } },
                                '@keyframes sparkle-4': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, -30px) scale(0)' } },
                                '@keyframes sparkle-5': { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(0, 30px) scale(0)' } },
                            }}
                        />
                    ))}
                </Box>
            </Button>

            {/* Only show Regenerate if content is NOT published */}
            {!currentContentItem || currentContentItem.status !== 'published' ? (
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<Refresh />}
                    onClick={onRegenerate}
                    fullWidth={isMobile}
                    sx={{
                        fontWeight: 600,
                        py: 1.5,
                        borderWidth: 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderWidth: 1,
                            backgroundColor: 'rgba(15, 108, 191, 0.08)',
                            transform: 'translateY(-2px)',
                        },
                    }}
                >
                    Regenerate
                </Button>
            ) : null}

            <Button
                variant="outlined"
                color="primary"
                startIcon={<Download />}
                onClick={onDownload}
                fullWidth={isMobile}
                sx={{
                    fontWeight: 600,
                    py: 1.5,
                    borderWidth: 1,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        borderWidth: 1,
                        backgroundColor: 'rgba(15, 108, 191, 0.08)',
                        transform: 'translateY(-2px)',
                    },
                }}
            >
                Download
            </Button>
        </Stack>
    );
};

export default PreviewActions;
