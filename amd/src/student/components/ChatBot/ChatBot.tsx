import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Avatar } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { WelcomeState } from './WelcomeState';
import { MessageItem } from './MessageItem';
import { FeedbackModal } from './FeedbackModal';
import { TypingIndicator } from './TypingIndicator';

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
    const handleSubmitFeedback = () => {
        if (!feedbackMessageId) {
            return;
        }

        setIsSubmitting(true);
        
        // Mark as disliked
        setFeedbackState(prev => ({
            ...prev,
            [feedbackMessageId]: 'down'
        }));
        
        // Simulate API call
        setTimeout(() => {
            // Send feedback to backend
            setIsSubmitting(false);
            handleCloseFeedbackDialog();
        }, 500);
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
