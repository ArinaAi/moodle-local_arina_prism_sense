import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Paper } from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SchoolIcon from '@mui/icons-material/School';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentNavigator from '../ContentNavigator/ContentNavigator';
import ContentViewer from '../ContentViewer/ContentViewer';
import ChatBot from '../ChatBot/ChatBot';
import { ContentProvider } from '../../context/ContentContext';

const MainLayout: React.FC = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <ContentProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f0f4f9' }}>
                {/* Header */}
                <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: 'white', zIndex: 1200 }}>
                    <Toolbar sx={{ minHeight: '64px !important' }}>
                        <Avatar sx={{ bgcolor: '#0b57d0', mr: 2 }}>
                            <SchoolIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                LectureBot
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                AI & Machine Learning Course
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />

                        <IconButton
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            sx={{
                                mr: 1,
                                bgcolor: isChatOpen ? '#e3f2fd' : 'transparent',
                                color: isChatOpen ? '#0b57d0' : '#444',
                                border: isChatOpen ? '1px solid #0b57d0' : '1px solid transparent',
                                '&:hover': { bgcolor: '#e3f2fd' }
                            }}
                        >
                            {isChatOpen ? (
                                <>
                                    <CloseIcon sx={{ mr: 0.5 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Close Chat</Typography>
                                </>
                            ) : (
                                <>
                                    <AutoAwesomeIcon sx={{ mr: 0.5 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Ask AI</Typography>
                                </>
                            )}
                        </IconButton>

                        <IconButton>
                            <NotificationsOutlinedIcon />
                        </IconButton>
                        <Avatar sx={{ ml: 1, bgcolor: '#0b57d0', width: 32, height: 32, fontSize: '0.875rem' }}>JS</Avatar>
                    </Toolbar>
                </AppBar>

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
