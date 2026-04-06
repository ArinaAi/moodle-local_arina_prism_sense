import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, useTheme, useMediaQuery } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentNavigator from '../ContentNavigator/ContentNavigator';
import ContentViewer from '../ContentViewer/ContentViewer';
import ChatBot from '../ChatBot/ChatBot';
import { useContent } from '../../context/ContentContext';
import Header from '../../../components/Layout/Header';
import type { MoodleContext } from '../../../types/moodle';

interface MainLayoutProps {
    moodleContext: MoodleContext;
}

// ... (Helper functions remain the same) ...
// Get button text based on chat state and screen size
const getButtonText = (isChatOpen: boolean, isMobile: boolean): string => {
    if (isChatOpen) { return isMobile ? 'Close' : 'Close Chat'; }
    return isMobile ? 'AI' : 'Ask AI';
};

// ... (Other helpers) ...

const getContentViewerLeft = (isChatOpen: boolean, isTablet: boolean): string | number => {
    if (isChatOpen) { return 0; }
    if (isTablet) { return 'calc(35% + 16px)'; }
    return 'calc(30% + 16px)';
};

// Responsive button styles
const getButtonStyles = () => ({
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    minHeight: 'clamp(36px, 8vw, 44px)', // Fluid touch target
    hoverTransform: 'translateY(-1px)',
});

// Chat button state styles
const chatOpenStyles = {
    bgcolor: '#f8fafc',
    borderColor: '#cbd5e1',
    color: '#64748b',
    boxShadow: 'none',
    '&:hover': {
        bgcolor: '#f1f5f9',
        borderColor: '#94a3b8',
        color: '#475569'
    }
};

const chatClosedStyles = (hoverTransform: string) => ({
    background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    color: '#0284c7',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)',
    '&:hover': {
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        borderColor: 'rgba(56, 189, 248, 0.6)',
        transform: hoverTransform,
        boxShadow: '0 6px 16px rgba(14, 165, 233, 0.25)',
    },
    '@media (hover: none)': {
        '&:hover': { transform: 'none' }
    }
});

// Panel widths based on tablet/desktop
const getPanelWidths = (isTablet: boolean) => ({
    navigatorWidth: isTablet ? 'calc(35% - 8px)' : 'calc(30% - 8px)',
    viewerWidth: isTablet ? 'calc(65% - 8px)' : 'calc(70% - 8px)',
    chatLeft: isTablet ? 'calc(65% + 16px)' : 'calc(70% + 16px)',
});

// Panel animation styles based on chat state
const getPanelAnimStyles = (isChatOpen: boolean) => ({
    navigator: {
        transform: isChatOpen ? 'translateX(-110%)' : 'translateX(0)',
        opacity: isChatOpen ? 0 : 1,
        pointerEvents: isChatOpen ? 'none' as const : 'auto' as const,
    },
    chat: {
        transform: isChatOpen ? 'translateX(0)' : 'translateX(110%)',
        opacity: isChatOpen ? 1 : 0,
        pointerEvents: isChatOpen ? 'auto' as const : 'none' as const,
    },
});

// Mobile content renderer based on state
const renderMobileContent = (isChatOpen: boolean, selectedContent: any, moodleContext: MoodleContext) => {
    if (isChatOpen) {
        return (
            <Paper
                elevation={0}
                sx={{
                    flex: 1,
                    bgcolor: 'white',
                    borderRadius: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <ChatBot moodleContext={moodleContext} />
            </Paper>
        );
    }
    
    if (selectedContent) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <ContentViewer />
            </Box>
        );
    }
    
    return (
        <Paper
            elevation={0}
            sx={{
                flex: 1,
                bgcolor: 'white',
                borderRadius: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                <ContentNavigator />
            </Box>
        </Paper>
    );
};

const MainLayout: React.FC<MainLayoutProps> = ({ moodleContext }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const { selectedContent, setSelectedContent } = useContent();

    // Reset chat on mobile when content selected to ensure full screen view
    useEffect(() => {
        if (isMobile && selectedContent) {
            setIsChatOpen(false);
        }
    }, [isMobile, selectedContent]);

    // Helper functions
    const buttonText = getButtonText(isChatOpen, isMobile);
    const contentViewerLeft = getContentViewerLeft(isChatOpen, isTablet);
    const buttonStyles = getButtonStyles();
    const panelWidths = getPanelWidths(isTablet);
    const panelAnim = getPanelAnimStyles(isChatOpen);

    // Mobile Navigation Handler
    const handleMobileBack = isMobile && selectedContent ? () => setSelectedContent(null) : undefined;

    return (
        <Box id="arina_prism_sense-tour-student-header" sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: '#f0f4f9' }}>
            {/* Header with Back Support */}
            <Header moodleContext={moodleContext} onBack={handleMobileBack}>
                <Button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    startIcon={isChatOpen ? <CloseIcon /> : <AutoAwesomeIcon />}
                    variant="outlined"
                    sx={{
                        mr: 1,
                        textTransform: 'none',
                        borderRadius: '20px',
                        padding: buttonStyles.padding,
                        fontSize: buttonStyles.fontSize,
                        fontWeight: 600,
                        minHeight: buttonStyles.minHeight,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        ...(isChatOpen ? chatOpenStyles : chatClosedStyles(buttonStyles.hoverTransform))
                    }}
                >
                    {buttonText}
                </Button>
            </Header>

            {/* Main Content Area */}
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: isMobile ? 0 : 'clamp(8px, 2vw, 16px)' }}>

                {/* Mobile Layout - Single View */}
                {isMobile ? (
                    <Box sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {renderMobileContent(isChatOpen, selectedContent, moodleContext)}
                    </Box>
                ) : (
                    /* Desktop/Tablet Layout - Sliding panels */
                    <Box sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        right: 16,
                        bottom: 16
                    }}>

                        {/* Content Navigator - 30% width, slides out to left */}
                        <Paper
                            id="arina_prism_sense-tour-content-navigator"
                            elevation={0}
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: panelWidths.navigatorWidth,
                                minWidth: '240px',
                                bgcolor: 'white',
                                borderRadius: 1,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                ...panelAnim.navigator,
                                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                            }}
                        >
                            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                                <ContentNavigator />
                            </Box>
                        </Paper>

                        {/* Preview/Content Viewer - 70% width, slides from right position to left position */}
                        <Box
                            id="arina_prism_sense-tour-content-viewer"
                            sx={{
                                position: 'absolute',
                                left: contentViewerLeft,
                                top: 0,
                                bottom: 0,
                                width: panelWidths.viewerWidth,
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                overflowY: 'auto'
                            }}>
                                <Box sx={{ width: '100%', height: '100%' }}>
                                    <ContentViewer />
                                </Box>
                            </Box>
                        </Box>

                        {/* ChatBot - 30% width, slides in from right */}
                        <Paper
                            elevation={0}
                            sx={{
                                position: 'absolute',
                                left: panelWidths.chatLeft,
                                top: 0,
                                bottom: 0,
                                width: panelWidths.navigatorWidth,
                                minWidth: '240px',
                                bgcolor: 'white',
                                borderRadius: 1,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                ...panelAnim.chat,
                                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                            }}
                        >
                            <ChatBot moodleContext={moodleContext} />
                        </Paper>

                    </Box>
                )}

            </Box>
        </Box>
    );
};

export default MainLayout;

