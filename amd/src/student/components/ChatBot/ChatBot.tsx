import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Avatar, ClickAwayListener } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

// Language options
type LanguageCode = 'en' | 'hi' | 'mr';
interface LanguageOption {
    code: LanguageCode;
    label: string;
    nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
    { code: 'en', label: 'English', nativeLabel: 'English'},
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी'},
    { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी'},
];
import { WelcomeState } from './WelcomeState';
import { MessageItem } from './MessageItem';
import { FeedbackModal } from './FeedbackModal';
import { TypingIndicator } from './TypingIndicator';
import type { MoodleContext } from '../../../types/moodle';

interface Message {
    id: string; // Added unique ID
    text: string;
    isBot: boolean;
    timestamp: Date;
}

interface ChatBotProps {
    moodleContext: MoodleContext;
}

const ChatBot: React.FC<ChatBotProps> = ({ moodleContext }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Language selector state
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

    // Feedback state: 'up', 'down', or null for each message id
    const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | null>>({});
    // Track which message is showing "copied" feedback
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    // Feedback dialog state
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackCategory, setFeedbackCategory] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (!text.trim()) { 
            return; 
        }

        const userMessage: Message = {
            id: Date.now().toString(),
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
                id: (Date.now() + 1).toString(),
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

    // Helper to save negative feedback to database
    const saveFeedbackToDatabase = async (
        messageId: string,
        category?: string | null,
        comments?: string | null
    ) => {
        // Find the message text for context
        const message = messages.find(m => m.id === messageId);
        const messageText = message?.text || '';

        try {
            const response = await apiFetch(
                `${moodleContext.wwwroot}/local/arina_prism_sense/api/save_chat_feedback.php`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        courseid: String(moodleContext.courseid),
                        messageid: messageId,
                        category: category || '',
                        comments: comments || '',
                        messagetext: messageText,
                        sesskey: moodleContext.sesskey,
                    }),
                }
            );
            const result = await response.json();
            if (!result.success) {
                console.error('Failed to save chat feedback:', result.error);
            }
        } catch (error) {
            if (error instanceof SessionExpiredError) { return; }
            console.error('Error saving chat feedback:', error);
        }
    };

    // Handle feedback (thumbs up/down)
    const handleFeedback = (messageId: string, type: 'up' | 'down') => {
        if (type === 'down') {
            setFeedbackMessageId(messageId);
            setFeedbackDialogOpen(true);
            return;
        }
        
        // Toggle thumbs up immediately
        setFeedbackState(prev => ({
            ...prev,
            [messageId]: prev[messageId] === type ? null : type
        }));
    };

    // Close feedback dialog
    const handleCloseFeedbackDialog = () => {
        setFeedbackDialogOpen(false);
        setFeedbackMessageId(null);
        setFeedbackText('');
        setFeedbackCategory(null);
    };

    // Submit feedback
    const handleSubmitFeedback = async () => {
        if (!feedbackMessageId) {
            return;
        }

        setIsSubmitting(true);
        
        // Mark as disliked
        setFeedbackState(prev => ({
            ...prev,
            [feedbackMessageId]: 'down'
        }));
        
        // Save feedback to database
        await saveFeedbackToDatabase(
            feedbackMessageId,
            feedbackCategory,
            feedbackText
        );

        setIsSubmitting(false);
        handleCloseFeedbackDialog();
    };

    // Handle copy to clipboard
    const handleCopy = async (messageId: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch {
            console.error('Failed to copy text');
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
                    <WelcomeState 
                        suggestedQuestions={suggestedQuestions}
                        onQuestionClick={handleSuggestedQuestion}
                    />
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageItem
                                key={msg.id}
                                message={msg}
                                feedbackState={feedbackState[msg.id] || null}
                                copiedMessageId={copiedMessageId}
                                onFeedback={handleFeedback}
                                onCopy={handleCopy}
                            />
                        ))}
                        {isTyping && <TypingIndicator />}
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
                    px: 'clamp(8px, 1.5vw, 12px)',
                    py: 'clamp(4px, 1vw, 6px)',
                    transition: 'all 0.2s',
                    '&:focus-within': {
                        borderColor: '#2563eb',
                        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }
                }}>
                    {/* Language Selector */}
                    <ClickAwayListener onClickAway={() => setLanguageMenuOpen(false)}>
                        <Box sx={{ position: 'relative' }}>
                            {/* Language Toggle Button */}
                            <Box
                                component="button"
                                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.5,
                                    border: 'none',
                                    borderRadius: 2,
                                    bgcolor: languageMenuOpen ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0,0,0,0.04)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                                    },
                                }}
                            >
                                <LanguageRoundedIcon sx={{ 
                                    fontSize: 18, 
                                    color: languageMenuOpen ? '#2563eb' : 'rgba(0,0,0,0.5)',
                                    transition: 'color 0.2s'
                                }} />
                                <Typography sx={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    color: languageMenuOpen ? '#2563eb' : 'rgba(0,0,0,0.6)',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    transition: 'color 0.2s'
                                }}>
                                    {selectedLanguage}
                                </Typography>

                            </Box>

                            {/* Language Dropdown Menu */}
                            <Box sx={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: 0,
                                bgcolor: 'white',
                                borderRadius: 1,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                overflow: 'hidden',
                                minWidth: 140,
                                zIndex: 100,
                                opacity: languageMenuOpen ? 1 : 0,
                                transform: languageMenuOpen ? 'translateY(0)' : 'translateY(8px)',
                                visibility: languageMenuOpen ? 'visible' : 'hidden',
                                transition: 'opacity 0.2s ease, transform 0.2s ease, visibility 0.2s',
                                pointerEvents: languageMenuOpen ? 'auto' : 'none',
                            }}>
                                <Box sx={{ 
                                    px: 1.5, 
                                    py: 0.75, 
                                    bgcolor: 'rgba(0,0,0,0.02)',
                                    borderBottom: '1px solid rgba(0,0,0,0.06)'
                                }}>
                                    <Typography sx={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: 700, 
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.8
                                    }}>
                                        Chat Language
                                    </Typography>
                                </Box>
                                {LANGUAGES.map((lang) => (
                                    <Box
                                        key={lang.code}
                                        component="button"
                                        onClick={() => {
                                            setSelectedLanguage(lang.code);
                                            setLanguageMenuOpen(false);
                                        }}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            width: '100%',
                                            px: 1.5,
                                            py: 1,
                                            border: 'none',
                                            bgcolor: selectedLanguage === lang.code 
                                                ? 'rgba(37, 99, 235, 0.08)' 
                                                : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            borderLeft: selectedLanguage === lang.code 
                                                ? '1px solid #2563eb' 
                                                : '3px solid transparent',
                                            '&:hover': {
                                                bgcolor: selectedLanguage === lang.code 
                                                    ? 'rgba(37, 99, 235, 0.12)' 
                                                    : 'rgba(0,0,0,0.04)',
                                            },
                                        }}
                                    >
                                        <Box sx={{ flex: 1, textAlign: 'left' }}>
                                            <Typography sx={{ 
                                                fontSize: '0.85rem', 
                                                fontWeight: selectedLanguage === lang.code ? 600 : 500,
                                                color: selectedLanguage === lang.code ? '#2563eb' : 'rgba(0,0,0,0.8)',
                                            }}>
                                                {lang.nativeLabel}
                                            </Typography>
                                        </Box>
                                        {selectedLanguage === lang.code && (
                                            <Box sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                bgcolor: '#2563eb',
                                            }}/>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </ClickAwayListener>

                    <TextField
                        fullWidth
                        placeholder="Ask a question..."
                        variant="standard"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        InputProps={{
                            disableUnderline: true,
                            sx: { fontSize: 'clamp(0.875rem, 2vw, 1rem)', ml: '5px'}
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

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackDialogOpen}
                isSubmitting={isSubmitting}
                feedbackText={feedbackText}
                feedbackCategory={feedbackCategory}
                onClose={handleCloseFeedbackDialog}
                onSubmit={handleSubmitFeedback}
                onTextChange={setFeedbackText}
                onCategoryChange={setFeedbackCategory}
            />
        </Box>
    );
};

export default ChatBot;
