// components/modals/VideoLectureModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    IconButton,
    Alert,
    Paper,
    Radio,
    FormControlLabel,
    FormControl,
    FormLabel,
    RadioGroup,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';

import type { ContentItem } from '../../types/app';
import SectionGroup from './video-lecture/SectionGroup';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';

type Language = 'en' | 'hi' | 'mr';

const OPTION_PAPER_STYLE = {
    // Fluid padding
    p: 'clamp(16px, 2vh, 24px)',
    borderRadius: '12px',
    bgcolor: 'white',
    border: '2px solid #e9ecef',
} as const;

interface VideoLectureModalProps {
    open: boolean;
    onClose: () => void;
    onGenerate: (
        contentId: number,
        contentStrategy: 'standard' | 'example_driven',
        language: Language,
        voiceGender: 'female' | 'male',
        avatarStrategy: 'none' | 'title_only'
    ) => void;
    contentItems: ContentItem[];

}

// Compose all styles
const getVideoModalStyles = (isMobile: boolean) => {
    const baseBoxStyles = getModalBoxStyles(isMobile, 'clamp(300px, 90vw, 650px)');
    const layoutStyles = getModalLayoutStyles(isMobile);

    return {
        //...getVideoModalLayoutStyles(isMobile), wait spread logic is tricky with return types
        modal: {
            ...baseBoxStyles,
            borderRadius: isMobile ? 0 : 1,
        },
        ...layoutStyles,
        subtitleFontSize: 'clamp(0.75rem, 0.5vw + 0.7rem, 0.875rem)',
        footerJustify: isMobile ? 'stretch' : 'flex-end',
    };
};

const VideoLectureModal: React.FC<VideoLectureModalProps> = ({
    open,
    onClose,
    onGenerate,
    contentItems,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use external helper function
    const styles = getVideoModalStyles(isMobile);

    const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
    const [contentStrategy, setContentStrategy] = useState<'standard' | 'example_driven'>('standard');
    const [language, setLanguage] = useState<Language>('en');
    const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
    const [avatarStrategy, setAvatarStrategy] = useState<'none' | 'title_only'>('none');

    // Filter and group slide decks by section
    const sectionGroups = useMemo(() => {
        const slideDecks = contentItems.filter(
            (item) => item.contenttype === 'slide-deck' && item.status === 'ready'
        );

        const grouped = new Map<number, ContentItem[]>();
        slideDecks.forEach((item) => {
            const existing = grouped.get(item.sectionid) || [];
            existing.push(item);
            grouped.set(item.sectionid, existing);
        });

        return Array.from(grouped.entries())
            .map(([sectionId, items]) => {
                items.sort((a, b) => b.timecreated - a.timecreated); // Newest first
                return {
                    sectionId,
                    sectionName: items[0].sectionname,
                    slides: items,
                };
            })
            .sort((a, b) => a.sectionId - b.sectionId); // Sort by section order
    }, [contentItems]);

    // Reset selection when modal opens
    useEffect(() => {
        if (open) {
            setSelectedSlideId(null);
            setContentStrategy('standard');
            setLanguage('en');
            setVoiceGender('female');
            setAvatarStrategy('none');
        }
    }, [open]);

    if (!open) {
        return null;
    }

    const handleGenerate = () => {
        if (!selectedSlideId) { return; }
        onGenerate(selectedSlideId, contentStrategy, language, voiceGender, avatarStrategy);
        onClose();
    };

    const renderContent = () => {
        if (sectionGroups.length === 0) {
            return (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        No slide decks found
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Please generate slides for a section first, then you can create video lectures from them.
                    </Typography>
                </Alert>
            );
        }

        return (
            <Box>
                {/* Section Selection */}
                <Typography
                    variant="subtitle2"
                    sx={{
                        mb: 2,
                        fontWeight: 600,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}
                >
                    Select Slide Deck
                </Typography>

                <Box sx={{ mb: 3 }}>
                    {sectionGroups.map(({ sectionId, sectionName, slides }) => (
                        <SectionGroup
                            key={sectionId}
                            sectionId={sectionId}
                            sectionName={sectionName}
                            slides={slides}
                            selectedSlideId={selectedSlideId}
                            onSelect={setSelectedSlideId}
                        />
                    ))}
                </Box>

                {/* Options Panel - Only show when slide selected */}
                {selectedSlideId && (
                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                mb: 2,
                                fontWeight: 600,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Video Options
                        </Typography>

                        <Paper
                            variant="outlined"
                            sx={{ ...OPTION_PAPER_STYLE, mb: 2 }}
                        >
                            <FormControl component="fieldset">
                                <FormLabel
                                    component="legend"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        mb: 1.5,
                                        '&.Mui-focused': { color: '#1a1a1a' },
                                    }}
                                >
                                    Content Type
                                </FormLabel>
                                <RadioGroup value={contentStrategy} onChange={(e) => setContentStrategy(e.target.value as 'standard' | 'example_driven')}>
                                    <FormControlLabel
                                        value="standard"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Standard
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Theory-focused approach
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ mb: 1, ml: 0, alignItems: 'flex-start' }}
                                    />
                                    <FormControlLabel
                                        value="example_driven"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Example Driven
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Practical examples and applications
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ ml: 0, alignItems: 'flex-start' }}
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{ ...OPTION_PAPER_STYLE, mb: 2 }}
                        >
                            <FormControl component="fieldset">
                                <FormLabel
                                    component="legend"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        mb: 1.5,
                                        '&.Mui-focused': { color: '#1a1a1a' },
                                    }}
                                >
                                    Language
                                </FormLabel>
                                <RadioGroup value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                                    <FormControlLabel value="en" control={<Radio />} label="English" sx={{ mb: 1, ml: 0 }} />
                                    <FormControlLabel value="hi" control={<Radio />} label="Hindi" sx={{ mb: 1, ml: 0 }} />
                                    <FormControlLabel value="mr" control={<Radio />} label="Marathi" sx={{ ml: 0 }} />
                                </RadioGroup>
                            </FormControl>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{ ...OPTION_PAPER_STYLE, mb: 2 }}
                        >
                            <FormControl component="fieldset">
                                <FormLabel
                                    component="legend"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        mb: 1.5,
                                        '&.Mui-focused': { color: '#1a1a1a' },
                                    }}
                                >
                                    Voice Tone
                                </FormLabel>
                                <RadioGroup value={voiceGender} onChange={(e) => setVoiceGender(e.target.value as 'female' | 'male')}>
                                    <FormControlLabel value="female" control={<Radio />} label="Female" sx={{ mb: 1, ml: 0 }} />
                                    <FormControlLabel value="male" control={<Radio />} label="Male" sx={{ ml: 0 }} />
                                </RadioGroup>
                            </FormControl>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={OPTION_PAPER_STYLE}
                        >
                            <FormControl component="fieldset">
                                <FormLabel
                                    component="legend"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        mb: 1.5,
                                        '&.Mui-focused': { color: '#1a1a1a' },
                                    }}
                                >
                                    Avatar
                                </FormLabel>
                                <RadioGroup value={avatarStrategy} onChange={(e) => setAvatarStrategy(e.target.value as 'none' | 'title_only')}>
                                    <FormControlLabel
                                        value="none"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    No Avatar
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Voice-only narration
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ mb: 1, ml: 0, alignItems: 'flex-start' }}
                                    />
                                    <FormControlLabel
                                        value="title_only"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    With Avatar (Additional 1000 credits)
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    AI presenter on title slides only
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ ml: 0, alignItems: 'flex-start' }}
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Paper>
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Modal open={open} onClose={onClose} sx={{ zIndex: 100001 }}>
            <Box
                sx={{
                    ...styles.modal,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: styles.padding,
                        pb: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        // Never shrink header
                        flexShrink: 0,
                    }}
                >
                    <Box>
                        <Typography variant={styles.titleVariant} sx={{ fontWeight: 600 }}>
                            Generate Video Lecture
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: styles.subtitleFontSize }}>
                            Convert your slides into an AI-powered video lecture
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={styles.touchTarget}
                    >
                        <Close />
                    </IconButton>
                </Box>

                {/* Content (Scrollable) */}
                <Box sx={{
                    p: styles.padding,
                    overflowY: 'auto',
                    flex: 1,
                    // IMPORTANT: allows children to shrink below content size
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {renderContent()}
                </Box>

                {/* Footer */}
                <Box sx={{
                    p: styles.padding,
                    pb: styles.footerPaddingBottom,
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    bgcolor: 'grey.50',
                    display: 'flex',
                    justifyContent: styles.footerJustify,
                    // Never shrink footer
                    flexShrink: 0,
                }}>
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleGenerate}
                        disabled={!selectedSlideId}
                        fullWidth={isMobile}
                        sx={{
                            fontWeight: 600,
                            px: 4,
                            py: 1.25,
                            ...styles.touchTarget,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                                boxShadow: '0 4px 12px rgba(15, 108, 191, 0.4)',
                            },
                            '&:disabled': {
                                background: '#e0e0e0',
                                color: '#9e9e9e',
                            },
                        }}
                    >
                        {selectedSlideId ? 'Generate Video' : 'Select Slides'}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default VideoLectureModal;
