import React, { useState } from 'react';
import { Box, Paper, Button } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentNavigator from '../ContentNavigator/ContentNavigator';
import ContentViewer from '../ContentViewer/ContentViewer';
import ChatBot from '../ChatBot/ChatBot';
import { ContentProvider } from '../../context/ContentContext';
import Header from '../../../components/Layout/Header';
import type { MoodleContext } from '../../../types/moodle';

interface MainLayoutProps {
    moodleContext: MoodleContext;
}

const MainLayout: React.FC<MainLayoutProps> = ({ moodleContext }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <ContentProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f0f4f9' }}>
                {/* Reused Header */}
                <Header moodleContext={moodleContext}>
                    <Button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        startIcon={isChatOpen ? <CloseIcon /> : <AutoAwesomeIcon />}
                        variant="outlined"
                        sx={{
                            mr: 1,
                            textTransform: 'none',
                            borderRadius: '20px',
                            padding: '6px 16px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            ...(isChatOpen ? {
                                // Active/Close State
                                bgcolor: '#f8fafc',
                                borderColor: '#cbd5e1',
                                color: '#64748b',
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: '#f1f5f9',
                                    borderColor: '#94a3b8',
                                    color: '#475569'
                                }
                            } : {
                                // "Ask AI" Premium State
                                background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                                color: '#0284c7', // Primary Blue
                                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                    borderColor: 'rgba(56, 189, 248, 0.6)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 6px 16px rgba(14, 165, 233, 0.25)',
                                }
                            })
                        }}
                    >
                        {isChatOpen ? 'Close Chat' : 'Ask AI'}
                    </Button>
                </Header>

                {/* Main Content Area */}
                <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: 2 }}>

                    {/* Sliding Container - absolute positioning for precise control */}
                    <Box sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        right: 16,
                        bottom: 16
                    }}>

                        {/* Content Navigator - 30% width, slides out to left */}
                        <Paper
                            elevation={0}
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 'calc(30% - 8px)',
                                minWidth: '240px',
                                bgcolor: 'white',
                                borderRadius: 1,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transform: isChatOpen ? 'translateX(-110%)' : 'translateX(0)',
                                opacity: isChatOpen ? 0 : 1,
                                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                                pointerEvents: isChatOpen ? 'none' : 'auto'
                            }}
                        >
                            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                                <ContentNavigator />
                            </Box>
                        </Paper>

                        {/* Preview/Content Viewer - 70% width, slides from right position to left position */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: isChatOpen ? 0 : 'calc(30% + 16px)',
                                top: 0,
                                bottom: 0,
                                width: 'calc(70% - 8px)',
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
                                left: 'calc(70% + 16px)',
                                top: 0,
                                bottom: 0,
                                width: 'calc(30% - 8px)',
                                minWidth: '240px',
                                bgcolor: 'white',
                                borderRadius: 1,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transform: isChatOpen ? 'translateX(0)' : 'translateX(110%)',
                                opacity: isChatOpen ? 1 : 0,
                                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                                pointerEvents: isChatOpen ? 'auto' : 'none'
                            }}
                        >
                            <ChatBot />
                        </Paper>

                    </Box>

                </Box>
            </Box>
        </ContentProvider>
    );
};

export default MainLayout;
