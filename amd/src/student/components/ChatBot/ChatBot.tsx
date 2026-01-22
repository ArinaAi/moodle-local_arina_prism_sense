import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Avatar, Chip, Fade } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface Message {
    id: string; // Added unique ID
    text: string;
    isBot: boolean;
    timestamp: Date;
}

const ChatBot: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const suggestedQuestions = [
        "Explain this concept in simple terms",
        "What are the key takeaways?",
        "Give me a quiz on this topic",
        "How does this relate to previous topics?"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = (text: string) => {
        if (!text.trim()) { return; }

        const userMessage: Message = {
            id: Date.now().toString(), // Simple unique ID
            text: text,
            isBot: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const botMessage: Message = {
                id: (Date.now() + 1).toString(), // Ensure unique ID
                text: "I'm a simulated AI response. The backend integration will come in the next phase!",
                isBot: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }, 1500);
    };

    const handleSuggestedQuestion = (question: string) => {
        handleSendMessage(question);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(input);
        }
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'white',
            overflow: 'hidden',
            borderRadius: '16px 16px 0 0'
        }}>
            {/* Chat Header */}
            <Box sx={{
                bgcolor: 'white',
                p: 'clamp(12px, 2vw, 20px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(12px, 2vw, 16px)',
                borderBottom: '1px solid rgba(0,0,0,0.08)'
            }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar sx={{
                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        width: 'clamp(36px, 8vw, 44px)',
                        height: 'clamp(36px, 8vw, 44px)'
                    }}>
                        <AutoAwesomeIcon fontSize="small" />
                    </Avatar>
                    {/* Online status indicator */}
                    <Box sx={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        width: 12,
                        height: 12,
                        bgcolor: '#22c55e',
                        border: '2px solid white',
                        borderRadius: '50%'
                    }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                        AI Tutor
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Online • Ready to help
                    </Typography>
                </Box>
            </Box>

            {/* Messages Area */}
            <Box sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: 'clamp(12px, 2vw, 16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(12px, 2vw, 16px)',
                bgcolor: '#fafbfc'
            }}>
                {messages.length === 0 ? (
                    // Welcome State
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        gap: 3,
                        py: 'clamp(24px, 4vw, 32px)'
                    }}>
                        <Avatar sx={{
                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563eb',
                            width: 'clamp(48px, 10vw, 64px)',
                            height: 'clamp(48px, 10vw, 64px)'
                        }}>
                            <AutoAwesomeIcon fontSize="large" />
                        </Avatar>
                        <Box sx={{ textAlign: 'center', maxWidth: '80%' }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>
                                Hi! I&apos;m your AI Tutor
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ask me anything about this lecture. I&apos;m here to help you understand better!
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
                                Try asking:
                            </Typography>
                            {suggestedQuestions.map((question) => (
                                <Chip
                                    key={question}
                                    label={question}
                                    onClick={() => handleSuggestedQuestion(question)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        height: 'auto',
                                        py: 'clamp(8px, 1.5vw, 12px)',
                                        px: 'clamp(12px, 2vw, 16px)',
                                        fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                                        fontWeight: 500,
                                        bgcolor: 'white',
                                        border: '1px solid rgba(37, 99, 235, 0.2)',
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: 'rgba(37, 99, 235, 0.04)',
                                            borderColor: '#2563eb',
                                            transform: 'translateX(4px)'
                                        },
                                        '& .MuiChip-label': {
                                            whiteSpace: 'normal',
                                            textAlign: 'left'
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                ) : (
                    // Messages
                    <>
                        {messages.map((msg) => (
                            <Fade in key={msg.id} timeout={300}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 1.5,
                                        flexDirection: msg.isBot ? 'row' : 'row-reverse',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    {msg.isBot && (
                                        <Avatar sx={{
                                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                                            color: '#2563eb',
                                            width: 32,
                                            height: 32,
                                            flexShrink: 0
                                        }}>
                                            <AutoAwesomeIcon fontSize="small" sx={{ fontSize: 16 }} />
                                        </Avatar>
                                    )}
                                    <Box
                                        sx={{
                                            maxWidth: '75%',
                                            px: 'clamp(14px, 3vw, 20px)',
                                            py: 'clamp(8px, 1.5vw, 12px)',
                                            borderRadius: 2.5,
                                            bgcolor: msg.isBot ? 'white' : '#2563eb',
                                            color: msg.isBot ? 'text.primary' : '#ffffff',
                                            border: msg.isBot ? '1px solid rgba(0,0,0,0.08)' : 'none',
                                            boxShadow: msg.isBot ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ lineHeight: 1.6, color: msg.isBot ? 'inherit' : '#ffffff', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                                            {msg.text}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Fade>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <Fade in timeout={300}>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <Avatar sx={{
                                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                                        color: '#2563eb',
                                        width: 32,
                                        height: 32
                                    }}>
                                        <AutoAwesomeIcon fontSize="small" sx={{ fontSize: 16 }} />
                                    </Avatar>
                                    <Box sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderRadius: 2.5,
                                        borderTopLeftRadius: 0,
                                        bgcolor: 'white',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        display: 'flex',
                                        gap: 0.5
                                    }}>
                                        {[0, 1, 2].map((dot) => (
                                            <Box
                                                key={dot}
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    bgcolor: '#2563eb',
                                                    animation: 'bounce 1.4s infinite',
                                                    animationDelay: `${dot * 0.2}s`,
                                                    '@keyframes bounce': {
                                                        '0%, 60%, 100%': { transform: 'translateY(0)' },
                                                        '30%': { transform: 'translateY(-8px)' }
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </Fade>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 'clamp(12px, 2vw, 16px)', bgcolor: 'white', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 6,
                    px: 'clamp(12px, 2vw, 16px)',
                    py: 'clamp(4px, 1vw, 6px)',
                    transition: 'all 0.2s',
                    '&:focus-within': {
                        borderColor: '#2563eb',
                        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }
                }}>
                    <TextField
                        fullWidth
                        placeholder="Ask a question..."
                        variant="standard"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        InputProps={{
                            disableUnderline: true,
                            sx: { fontSize: 'clamp(0.875rem, 2vw, 1rem)' }
                        }}
                        sx={{ '& input::placeholder': { fontSize: 'clamp(0.875rem, 2vw, 1rem)' } }}
                    />
                    <IconButton
                        size="small"
                        onClick={() => handleSendMessage(input)}
                        disabled={!input.trim()}
                        sx={{
                            bgcolor: input.trim() ? '#2563eb' : 'rgba(0,0,0,0.04)',
                            color: input.trim() ? 'white' : 'rgba(0,0,0,0.26)',
                            width: 'clamp(32px, 8vw, 36px)',
                            height: 'clamp(32px, 8vw, 36px)',
                            '&:hover': {
                                bgcolor: input.trim() ? '#1d4ed8' : 'rgba(0,0,0,0.08)',
                            },
                            '&:disabled': {
                                bgcolor: 'rgba(0,0,0,0.04)',
                                color: 'rgba(0,0,0,0.26)'
                            }
                        }}
                    >
                        <SendRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatBot;
