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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    useTheme,
    useMediaQuery,
    Tooltip,
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

    // Overwrite confirmation dialog state
    const [overwriteConfirm, setOverwriteConfirm] = useState(false);

    // Detect if a video exists in this section from a different slide version with the same settings.
    // This means generating will overwrite an older video in the section.
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
            if (item.status === 'error' || item.status === 'generating') { return false; }
            if (item.sectionid !== selectedSlide.sectionid) { return false; }

            const genData = item.generationdata
                ? (JSON.parse(item.generationdata) as Record<string, unknown>)
                : {};

            // Two-tier: temp items carry source_content_id; real backend items use regen_count fallback
            const srcId = genData['source_content_id'];
            const isFromCurrentSlide = srcId !== null && srcId !== undefined
                ? Number(srcId) === selectedSlideId
                : genData['regen_count'] === slideRegenCount;

            // A stale video was generated from a different slide in this section
            if (isFromCurrentSlide) { return false; }

            return (
                genData['language'] === language &&
                genData['voice_gender'] === voiceGender &&
                genData['avatar_strategy'] === avatarStrategy
            );
        }) ?? null;
    }, [selectedSlideId, contentItems, language, voiceGender, avatarStrategy]);

    // Detect if a video was already generated from this exact slide with the same settings.
    // Two-tier: source_content_id for temp items, regen_count fallback for real backend items.
    const duplicateVideo = useMemo(() => {
        if (!selectedSlideId) { return null; }

        const selectedSlide = contentItems.find(item => item.id === selectedSlideId);
        if (!selectedSlide) { return null; }

        const slideGenData = selectedSlide.generationdata
            ? (JSON.parse(selectedSlide.generationdata) as Record<string, unknown>)
            : {};
        const slideRegenCount = slideGenData['regen_count'] ?? 0;

        return contentItems.find(item => {
            if (item.contenttype !== 'video') { return false; }
            if (item.status === 'error' || item.status === 'generating') { return false; }

            const genData = item.generationdata
                ? (JSON.parse(item.generationdata) as Record<string, unknown>)
                : {};

            // Two-tier: temp items carry source_content_id; real backend items use regen_count fallback
            const srcId = genData['source_content_id'];
            const isFromCurrentSlide = srcId !== null && srcId !== undefined
                ? Number(srcId) === selectedSlideId
                : (item.sectionid === selectedSlide.sectionid &&
                   genData['regen_count'] === slideRegenCount);

            if (!isFromCurrentSlide) { return false; }

            return (
                genData['language'] === language &&
                genData['voice_gender'] === voiceGender &&
                genData['avatar_strategy'] === avatarStrategy
            );
        }) ?? null;
    }, [selectedSlideId, contentItems, language, voiceGender, avatarStrategy]);

    // Detect if a video generation is currently in progress for this ppt with the same settings.
    const inProgressVideo = useMemo(() => {
        if (!selectedSlideId) { return null; }

        const selectedSlide = contentItems.find(item => item.id === selectedSlideId);
        if (!selectedSlide) { return null; }

        const slideGenData = selectedSlide.generationdata
            ? (JSON.parse(selectedSlide.generationdata) as Record<string, unknown>)
            : {};
        const slideRegenCount = slideGenData['regen_count'] ?? 0;

        return contentItems.find(item => {
            if (item.contenttype !== 'video') { return false; }
            if (item.status !== 'generating') { return false; }
            if (item.sectionid !== selectedSlide.sectionid) { return false; }

            const genData = item.generationdata
                ? (JSON.parse(item.generationdata) as Record<string, unknown>)
                : {};

            // Two-tier: temp items carry source_content_id; real backend items use regen_count fallback
            const srcId = genData['source_content_id'];
            const isFromCurrentSlide = srcId !== null && srcId !== undefined
                ? Number(srcId) === selectedSlideId
                : genData['regen_count'] === slideRegenCount;

            if (!isFromCurrentSlide) { return false; }

            return (
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

    const doGenerate = () => {
        if (!selectedSlideId) { return; }
        onGenerate(selectedSlideId, 'standard', language, voiceGender, avatarStrategy);
        onClose();
    };

    const handleGenerate = () => {
        if (!selectedSlideId) { return; }
        if (duplicateVideo) {
            setOverwriteConfirm(true);
            return;
        }
        doGenerate();
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
                                severity="info"
                                sx={{ mt: 2, borderRadius: 2 }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    A video with these settings already exists — it will be overwritten.
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <>
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
                    <Tooltip
                        title={inProgressVideo ? 'Generation in progress' : ''}
                        placement="top"
                        arrow
                        slotProps={{ popper: { sx: { zIndex: 100030 } } }}
                    >
                        <span style={{ display: isMobile ? 'block' : 'inline-flex' }}>
                            <Button
                                variant="contained"
                                size="medium"
                                onClick={handleGenerate}
                                disabled={!selectedSlideId || !!inProgressVideo}
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
                                {selectedSlideId
                                    ? inProgressVideo
                                        ? 'Generating...'
                                        : (duplicateVideo ? 'Regenerate' : 'Generate Video')
                                    : 'Select Slides'
                                }
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Modal>

        {/* Overwrite confirmation dialog — outside Modal to avoid single-child constraint */}
            <Dialog
                open={overwriteConfirm}
                onClose={() => setOverwriteConfirm(false)}
                maxWidth="xs"
                fullWidth
                sx={{ zIndex: 100020 }}
                PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Overwrite Existing Video?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Existing video with same settings will be overwritten. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setOverwriteConfirm(false)}
                        color="inherit"
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => { setOverwriteConfirm(false); doGenerate(); }}
                        variant="contained"
                        color="primary"
                    >
                        Continue
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default VideoLectureModal;
