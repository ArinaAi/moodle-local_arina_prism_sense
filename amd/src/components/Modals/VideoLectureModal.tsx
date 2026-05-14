// components/modals/VideoLectureModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSessionCheck } from '../../utils/useSessionCheck';
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
    Chip,
    Autocomplete,
    TextField,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';

import type { ContentItem } from '../../types/app';
import { SUPPORTED_LANGUAGES, type Language } from '../../types/languages';
import SectionGroup from './video-lecture/SectionGroup';
import { getModalBoxStyles, getModalLayoutStyles } from '../../utils/modalStyles';

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
        language: string,
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

    // Session check: redirect to login if session expired when modal opens
    const { checkSession } = useSessionCheck(window.MOODLE_CONTEXT ?? null);
    useEffect(() => {
        if (open) {
            checkSession();
        }
    }, [open, checkSession]);

    // Use external helper function
    const styles = getVideoModalStyles(isMobile);

    const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);

    const [language, setLanguage] = useState<Language>('en');
    const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
    const [avatarStrategy, setAvatarStrategy] = useState<'none' | 'title_only'>('none');

    // Filter and group slide decks by section
    const sectionGroups = useMemo(() => {
        const slideDecks = contentItems.filter(
            (item) => item.contenttype === 'slide-deck' && 
                      (item.status === 'ready' || item.status === 'published') &&
                      item.sectionname !== 'Deleted Section'
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

    // Detect if a video exists for the same section + settings but from an older slide version (different regen_count).
    // This means the user regenerated the slide and is now trying to generate a video again — the old video will be overwritten.
    const staleVideo = useMemo(() => {
        if (!selectedSlideId) { return null; }

        const selectedSlide = contentItems.find(item => item.id === selectedSlideId);
        if (!selectedSlide) { return null; }

        const slideGenData = selectedSlide.generationdata
            ? (JSON.parse(selectedSlide.generationdata) as Record<string, unknown>)
            : {};
        const slideRegenCount = slideGenData['regen_count'] ?? 0;

        return contentItems.find(item => {
            if (item.contenttype !== 'video') { return false; }
            if (item.status === 'error') { return false; }
            if (item.sectionid !== selectedSlide.sectionid) { return false; }

            const genData = item.generationdata
                ? (JSON.parse(item.generationdata) as Record<string, unknown>)
                : {};

            return (
                genData['regen_count'] !== slideRegenCount &&
                genData['language'] === language &&
                genData['voice_gender'] === voiceGender &&
                genData['avatar_strategy'] === avatarStrategy
            );
        }) ?? null;
    }, [selectedSlideId, contentItems, language, voiceGender, avatarStrategy]);

    // Detect if a video with the same settings already exists for the selected slide.
    // Videos are matched by sectionid + regen_count (slide version) + language + voice_gender + avatar_strategy.
    const duplicateVideo = useMemo(() => {
        if (!selectedSlideId) {return null};

        const selectedSlide = contentItems.find(item => item.id === selectedSlideId);
        if (!selectedSlide) {return null};

        const slideGenData = selectedSlide.generationdata
            ? (JSON.parse(selectedSlide.generationdata) as Record<string, unknown>)
            : {};
        const slideRegenCount = slideGenData['regen_count'] ?? 0;

        return contentItems.find(item => {
            if (item.contenttype !== 'video') {return false};
            if (item.status === 'error') {return false};
            if (item.sectionid !== selectedSlide.sectionid) {return false};

            const genData = item.generationdata
                ? (JSON.parse(item.generationdata) as Record<string, unknown>)
                : {};

            return (
                genData['regen_count'] === slideRegenCount &&
                genData['language'] === language &&
                genData['voice_gender'] === voiceGender &&
                genData['avatar_strategy'] === avatarStrategy
            );
        }) ?? null;
    }, [selectedSlideId, contentItems, language, voiceGender, avatarStrategy]);

    // Reset selection when modal opens
    useEffect(() => {
        if (open) {
            setSelectedSlideId(null);
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
        onGenerate(selectedSlideId, 'standard', language, voiceGender, avatarStrategy);
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
                        {staleVideo && !duplicateVideo && (
                            <Alert
                                severity="warning"
                                sx={{ mb: 2, borderRadius: 2 }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Please note: the existing video will be overwritten
                                </Typography>
                            </Alert>
                        )}

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



                        {/* ── Language Selector ── */}
                        <Paper
                            variant="outlined"
                            sx={{ ...OPTION_PAPER_STYLE, mb: 2 }}
                        >
                            <FormLabel
                                component="legend"
                                sx={{
                                    fontWeight: 600,
                                    color: '#1a1a1a',
                                    mb: 1,
                                    display: 'block',
                                    '&.Mui-focused': { color: '#1a1a1a' },
                                }}
                            >
                                Language
                            </FormLabel>
                            <Autocomplete
                                options={SUPPORTED_LANGUAGES}
                                getOptionLabel={(opt) => opt.label}
                                value={SUPPORTED_LANGUAGES.find((l) => l.value === language)!}
                                onChange={(_e, opt) => { if (opt) {setLanguage(opt.value as Language);} }}
                                disableClearable
                                size="small"
                                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                                slotProps={{
                                    popper: { sx: { zIndex: 100002 } },
                                    paper: {
                                        sx: {
                                            borderRadius: '10px',
                                            mt: 0.5,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                                            '& .MuiAutocomplete-option': {
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                            },
                                            '& .MuiAutocomplete-option[aria-selected="true"]': {
                                                bgcolor: 'rgba(15,108,191,0.08)',
                                                color: '#0f6cbf',
                                                fontWeight: 600,
                                            },
                                            '& .MuiAutocomplete-option:hover': {
                                                bgcolor: 'rgba(15,108,191,0.05)',
                                            },
                                        },
                                    },
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search language..."
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                bgcolor: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                '& fieldset': {
                                                    borderColor: '#e9ecef',
                                                    borderWidth: '1.5px',
                                                },
                                                '&:hover fieldset': { borderColor: '#0f6cbf' },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0f6cbf',
                                                    borderWidth: '1.5px',
                                                },
                                            },
                                        }}
                                    />
                                )}
                            />
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
                                    Video Gen
                                </FormLabel>
                                <RadioGroup value={avatarStrategy} onChange={(e) => setAvatarStrategy(e.target.value as 'none' | 'title_only')}>
                                    <FormControlLabel
                                        value="none"
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        No Avatar
                                                    </Typography>
                                                    <Chip label="1 Credit / 20s" size="small" sx={{ bgcolor: 'rgba(15, 108, 191, 0.1)', color: '#0f6cbf', fontWeight: 600, fontSize: '0.65rem', height: '18px' }} />
                                                </Box>
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
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        With Avatar
                                                    </Typography>
                                                    <Chip label="1.25 Credits / 20s" size="small" sx={{ bgcolor: 'rgba(15, 108, 191, 0.1)', color: '#0f6cbf', fontWeight: 600, fontSize: '0.65rem', height: '18px' }} />
                                                </Box>
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

                        {duplicateVideo && (
                            <Alert
                                severity="warning"
                                sx={{ mt: 2, borderRadius: 2 }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    Video already generated with the same settings
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    A video with these settings already exists for this slide. Please regenerate the slides first before generating a new video with the same settings.
                                </Typography>
                            </Alert>
                        )}
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
                        disabled={!selectedSlideId || !!duplicateVideo}
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
