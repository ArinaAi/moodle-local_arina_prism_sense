import React, { useState, useMemo } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Button,
    Portal,
    Collapse,
} from '@mui/material';
import { X, HelpCircle, Play, ChevronDown } from 'lucide-react';

// ── Page context ──────────────────────────────────────────────────────────────
type PageContext = 'teacher' | 'student' | 'cms';

// ── Video catalogue ───────────────────────────────────────────────────────────
const ALL_VIDEOS: {
    id: string;
    title: string;
    subtitle: string;
    accent: string;
    relevantFor: PageContext[];
    steps: string[];
}[] = [
    {
        id: 'GcnP_qp4IGQ',
        title: 'Generating slide decks',
        subtitle: 'AI slide builder',
        accent: '#1a56db',
        relevantFor: ['teacher'],
        steps: [
            'Select your unit.',
            'Recheck the curriculum.',
            'Choose the presentation depth and content style.',
            'Let the AI create your deck.',
            'Once finished, you can preview the slide deck, download it, or instantly regenerate slides using simple feedback.',
        ],
    },
    {
        id: 'Iu_QpgG8M04',
        title: 'Generating video lectures',
        subtitle: 'AI video builder',
        accent: '#c2410c',
        relevantFor: ['teacher'],
        steps: [
            'Select your unit: Begin by identifying the specific curriculum or content topic you wish to cover .',
            'Customize settings: Choose your preferred language, voice tone, and selection between an avatar or non-avatar mode .',
            'Automatic generation: Allow the AI to automatically generate the complete video, which takes approximately 5 minutes .',
            'Finalize: Once the process is complete, you can preview and download your generated video instantly .',
        ],
    },
    {
        id: 'jXkXQ3HLdh0',
        title: 'Review, approve & publish',
        subtitle: 'Content workflow',
        accent: '#059669',
        relevantFor: ['teacher'],
        steps: [
            'Content Review: Educators and administrators review AI-generated content, such as slide decks and video lectures, to ensure quality, accuracy, and readiness for students.',
            'Approval Workflow: Stakeholders utilize a centralized system to perform content validation, quality checks, and manage necessary revisions through collaborative tools.',
            'Publishing Management: Once approved, content can be published instantly to the student portal with a single click, enabling rapid deployment of learning experiences.',
        ],
    },
    {
        id: 'cijiR619eFQ',
        title: 'Uploading reference files',
        subtitle: 'PDF import workflow',
        accent: '#d97706',
        relevantFor: ['teacher'],
        steps: [
            'Upload Reference Content: Begin by uploading your reference documents.',
            'Add Details: Provide the necessary title and author information for your files.',
            'Preview: Review the uploaded file to ensure everything is correct.',
            'Utilize Content: Once ready, use your uploaded content to generate AI-powered outputs — slide decks, video lessons, question answering, and practice exercises.',
        ],
    },
    {
        id: 'jNcETo0FA-I',
        title: 'Student personalisation',
        subtitle: 'Learning experience',
        accent: '#7c3aed',
        relevantFor: ['student'],
        steps: [
            'Access the Portal: Switch to the student portal to view your learning resources.',
            'Review Materials: Preview published slides and video lectures.',
            'Track Progress: Mark your lessons as completed to keep track of your journey.',
            'Get AI Support: Engage with the built-in AI for instant help and support whenever needed.',
        ],
    },
    {
        id: 'W0TRyYAh6yA',
        title: 'Credits & user management',
        subtitle: 'Admin panel',
        accent: '#0f6cbf',
        relevantFor: ['cms'],
        steps: [
            'Monitor Consumption: Administrators can use the credit management dashboard to track credits consumed across various activities, such as slide deck generation and video creation.',
            'Staff Management: This functionality allows for the allocation, distribution, or recalling of credits to specific teams and users.',
            'Financial Oversight: The platform provides a financial section that offers complete credit acquisition history and transaction visibility.',
            'Audit Ledger: To ensure transparency, the system maintains a complete audit ledger for traceable credit tracking across the platform.',
        ],
    },
];

interface HelpDrawerProps {
    open: boolean;
    onClose: () => void;
    pageContext?: PageContext;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ open, onClose, pageContext = 'teacher' }) => {
    const [activeVideo, setActiveVideo] = useState<{ id: string; title: string } | null>(null);
    const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

    const sortedVideos = useMemo(() => {
        const relevant = ALL_VIDEOS.filter(v => v.relevantFor.includes(pageContext));
        const others   = ALL_VIDEOS.filter(v => !v.relevantFor.includes(pageContext));
        return [...relevant, ...others];
    }, [pageContext]);

    const handleStartTour = () => {
        onClose();
        const win = window as Window & { startArinaPrismSenseTour?: () => void };
        if (typeof win.startArinaPrismSenseTour === 'function') {
            setTimeout(() => win.startArinaPrismSenseTour!(), 300);
        }
    };

    const toggleExpand = (e: React.MouseEvent, videoId: string) => {
        e.stopPropagation();
        setExpandedVideo(prev => prev === videoId ? null : videoId);
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                disableScrollLock
                PaperProps={{
                    sx: {
                        width: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
                    },
                }}
                sx={{ zIndex: 99999 }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                        Help center
                    </Typography>
                    <IconButton size="small" onClick={onClose} aria-label="Close help center"
                        sx={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid', borderColor: 'divider', color: 'text.secondary', '&:hover': { backgroundColor: 'action.hover' } }}>
                        <X size={14} />
                    </IconButton>
                </Box>

                {/* Scrollable body */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>

                        {/* Tour CTA card */}
                        <Box sx={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', p: 2.5, textAlign: 'center' }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, color: '#1d4ed8' }}>
                                <HelpCircle size={20} />
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e40af', mb: 0.75 }}>
                                Interactive tour
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#3b82f6', lineHeight: 1.6 }}>
                                A guided walkthrough of every feature &mdash; takes about 3 minutes.
                            </Typography>
                            <Button fullWidth variant="contained" onClick={handleStartTour}
                                sx={{ mt: 1.75, py: '10px', backgroundColor: '#1a56db', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none', boxShadow: 'none', '&:hover': { backgroundColor: '#1e40af', boxShadow: 'none' } }}>
                                Start the tour
                            </Button>
                        </Box>

                        {/* Video list */}
                        <Box sx={{ border: '1px solid #f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                            {sortedVideos.map((v, idx) => (
                                <Box key={v.id} sx={{ borderBottom: idx < sortedVideos.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    {/* Video row */}
                                    <Box
                                        onClick={() => setActiveVideo({ id: v.id, title: v.title })}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.125, cursor: 'pointer', transition: 'background 0.12s', '&:hover': { backgroundColor: '#f9fafb' }, '&:hover .vthumb': { borderColor: v.accent } }}
                                    >
                                        {/* Thumbnail */}
                                        <Box className="vthumb" sx={{ width: 64, height: 40, borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0, overflow: 'hidden', position: 'relative', backgroundColor: '#f1f5f9', transition: 'border-color 0.15s' }}>
                                            <Box component="img" src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.title}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                                            {!v.relevantFor.includes(pageContext) && (
                                                <Box sx={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: '3px', px: '4px', py: '1px' }}>
                                                    <Typography sx={{ fontSize: '0.5625rem', color: '#fff', lineHeight: 1.4 }}>
                                                        {v.relevantFor[0] === 'cms' ? 'Admin' : v.relevantFor[0] === 'student' ? 'Student' : 'Teacher'}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Box sx={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                                <Play size={12} fill="currentColor" stroke="none" />
                                            </Box>
                                        </Box>

                                        {/* Meta */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {v.title}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.6875rem', color: '#9ca3af', mt: '2px' }}>
                                                {v.subtitle}
                                            </Typography>
                                        </Box>

                                        {/* Expand toggle */}
                                        <IconButton
                                            size="small"
                                            onClick={(e) => toggleExpand(e, v.id)}
                                            aria-label={expandedVideo === v.id ? 'Collapse steps' : 'Expand steps'}
                                            sx={{ width: 24, height: 24, flexShrink: 0, borderRadius: '5px', color: '#6b7280', '&:hover': { backgroundColor: '#f3f4f6', color: '#374151' } }}
                                        >
                                            <ChevronDown size={13} style={{ transition: 'transform 0.2s ease', transform: expandedVideo === v.id ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                        </IconButton>
                                    </Box>

                                    {/* Steps accordion */}
                                    <Collapse in={expandedVideo === v.id} unmountOnExit>
                                        <Box sx={{ px: 1.5, pt: 1, pb: 1.25, backgroundColor: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                                            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#374151', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Steps to follow
                                            </Typography>
                                            <Box component="ol" sx={{ m: 0, pl: '18px' }}>
                                                {v.steps.map((step, i) => (
                                                    <Box component="li" key={i}
                                                        sx={{ fontSize: '0.6875rem', color: '#4b5563', lineHeight: 1.65, mb: i < v.steps.length - 1 ? 0.625 : 0 }}>
                                                        {step}
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Collapse>
                                </Box>
                            ))}
                        </Box>

                    </Box>
                </Box>

                {/* Footer */}
                <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider', backgroundColor: '#fafafa', flexShrink: 0, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                        Need more help?{' '}
                        <Box component="a" href="mailto:support@arina.ai" sx={{ color: '#1a56db', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            Contact support
                        </Box>
                    </Typography>
                </Box>
            </Drawer>

            {/* Video lightbox */}
            {activeVideo && (
                <Portal>
                    <Box onClick={() => setActiveVideo(null)}
                        sx={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, '@keyframes bdIn': { from: { opacity: 0 }, to: { opacity: 1 } }, animation: 'bdIn 0.2s ease' }}>
                        <Box onClick={(e) => e.stopPropagation()}
                            sx={{ position: 'relative', width: '100%', maxWidth: 800, backgroundColor: '#111827', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', '@keyframes dlgIn': { from: { opacity: 0, transform: 'scale(0.95) translateY(12px)' }, to: { opacity: 1, transform: 'scale(1) translateY(0)' } }, animation: 'dlgIn 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
                            {/* Title bar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid #1f2937' }}>
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>
                                    {activeVideo.title}
                                </Typography>
                                <IconButton size="small" onClick={() => setActiveVideo(null)} aria-label="Close video"
                                    sx={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid #374151', color: '#9ca3af', '&:hover': { backgroundColor: '#1f2937', color: '#e5e7eb' } }}>
                                    <X size={14} />
                                </IconButton>
                            </Box>
                            {/* YouTube embed — full controls */}
                            <Box component="iframe"
                                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                                title={activeVideo.title}
                                sx={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }} />
                        </Box>
                    </Box>
                </Portal>
            )}
        </>
    );
};
