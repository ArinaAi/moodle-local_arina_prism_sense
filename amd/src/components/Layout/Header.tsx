import React, { useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import type { MoodleContext } from '../../types/moodle';
import { MessageSquareMore, HelpCircle } from 'lucide-react';
import { HelpDrawer } from '../../cms/components/shared/HelpDrawer';

interface HeaderProps {
    moodleContext: MoodleContext;
    children?: React.ReactNode;
    onBack?: () => void;
    onOpenPluginFeedback?: () => void;
    creditBadge?: React.ReactNode;
    helpContext?: 'teacher' | 'student';
}

const Header: React.FC<HeaderProps> = ({ moodleContext, children, onBack, onOpenPluginFeedback, creditBadge, helpContext = 'teacher' }) => {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const [helpOpen, setHelpOpen] = useState(false);

    if (!moodleContext) {
        return null;
    }

    // Determine typography variant based on screen size
    const getTitleVariant = () => {
        if (isMobile) { return 'subtitle1'; }
        if (isTablet) { return 'h6'; }
        return 'h5';
    };
    const titleVariant = getTitleVariant();

    return (
        <Box
            id="arina_prism_sense-tour-header"
            component="header"
            sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                px: { xs: 1.5, sm: 2, md: 2 },
                py: { xs: 1, sm: 1.5, md: 2 },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                zIndex: 10,
                gap: { xs: 1, sm: 2 },
                maxHeight: { xs: '32px', sm: '44px', md: '60px', lg: '76px' },
            }}
        >
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                flex: 1,
                minWidth: 0, // Enable text truncation
            }}>
                <button
                    onClick={() => {
                        if (onBack) {
                            onBack();
                        } else {
                            globalThis.location.href = `${moodleContext.wwwroot}/course/view.php?id=${moodleContext.courseid}`;
                        }
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, background-color 0.15s ease',
                        padding: 0,
                        flexShrink: 0,
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                        e.currentTarget.style.borderColor = '#dee2e6';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e9ecef';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                        e.currentTarget.style.borderColor = '#dee2e6';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e9ecef';
                    }}
                    title="Back to course"
                >
                    <svg
                        width={isMobile ? "18" : "20"}
                        height={isMobile ? "18" : "20"}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0f6cbf"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        variant={titleVariant}
                        component="h1"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: { xs: '1rem', sm: '1.15rem', md: '1.35rem' },
                        }}
                    >
                        {moodleContext.coursename}
                    </Typography>
                    {!isMobile && (
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                mt: 0.25,
                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                            }}
                        >
                            AI-Powered Lecture Builder
                        </Typography>
                    )}
                </Box>
            </Box>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                flexShrink: 0,
            }}>
                {children}
                {/* Credit Balance Badge */}
                {creditBadge}
                {/* Help Center Button */}
                <Tooltip title="Help center" arrow PopperProps={{ sx: { zIndex: 100000 } }}>
                    <IconButton
                        onClick={() => setHelpOpen(true)}
                        size="small"
                        aria-label="Open help center"
                        sx={{
                            width: { xs: 28, sm: 40 },
                            height: { xs: 28, sm: 40 },
                            backgroundColor: helpOpen ? 'primary.main' : 'transparent',
                            border: '1px solid',
                            borderColor: 'primary.main',
                            color: helpOpen ? '#fff' : 'primary.main',
                            transition: 'transform 0.15s ease, background-color 0.15s ease',
                            '&:hover': {
                                backgroundColor: helpOpen ? 'primary.dark' : 'rgba(15, 108, 191, 0.08)',
                                borderColor: 'primary.dark',
                                transform: 'scale(1.05)',
                            },
                            '&:active': {
                                transform: 'scale(0.95)',
                            },
                        }}
                    >
                        <HelpCircle
                            size={isMobile ? 16 : 20}
                            strokeWidth={2}
                        />
                    </IconButton>
                </Tooltip>
                <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} pageContext={helpContext} />
                {/* Plugin Feedback Button */}
                {onOpenPluginFeedback && (
                    <IconButton
                        id="arina_prism_sense-tour-report-issue"
                        onClick={onOpenPluginFeedback}
                        size="small"
                        sx={{
                            width: { xs: 28, sm: 40 },
                            height: { xs: 28, sm: 40 },
                            backgroundColor: 'transparent',
                            border: '1px solid',
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            transition: 'transform 0.15s ease, background-color 0.15s ease',
                            '&:hover': {
                                backgroundColor: 'rgba(15, 108, 191, 0.08)',
                                borderColor: 'primary.dark',
                                transform: 'scale(1.05)',
                            },
                            '&:active': {
                                transform: 'scale(0.95)',
                            },
                        }}
                        title="Report an issue or suggest a feature"
                    >
                        <MessageSquareMore
                            size={isMobile ? 16 : 20} // Responsive icon size
                            strokeWidth={2}
                        />
                    </IconButton>
                )}
                <Box
                    component="img"
                    src={`${moodleContext.wwwroot}/local/arina_prism_sense/pix/icon.png?v=1`}
                    alt="Arina AI"
                    sx={{
                        height: { xs: 36, sm: 48, md: 60 },
                        width: 'auto',
                        objectFit: 'contain',
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                    }}
                />
            </Box>
        </Box>
    );
};

export default Header;
