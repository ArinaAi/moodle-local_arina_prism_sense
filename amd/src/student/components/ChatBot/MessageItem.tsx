import React from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface Message {
    id: string;
    text: string;
    isBot: boolean;
    timestamp: Date;
}

interface MessageItemProps {
    message: Message;
    feedbackState: 'up' | 'down' | null;
    copiedMessageId: string | null;
    onFeedback: (messageId: string, type: 'up' | 'down') => void;
    onCopy: (messageId: string, text: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
    message,
    feedbackState,
    copiedMessageId,
    onFeedback,
    onCopy
}) => {
    const isCopied = copiedMessageId === message.id;

    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexDirection: message.isBot ? 'row' : 'row-reverse',
                    alignItems: 'flex-start'
                }}
            >
                {message.isBot && (
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
                <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: '75%' }}>
                    <Box
                        sx={{
                            px: 'clamp(14px, 3vw, 20px)',
                            py: 'clamp(8px, 1.5vw, 12px)',
                            borderRadius: 2.5,
                            bgcolor: message.isBot ? 'white' : '#2563eb',
                            color: message.isBot ? 'text.primary' : '#ffffff',
                            border: message.isBot ? '1px solid rgba(0,0,0,0.08)' : 'none',
                            boxShadow: message.isBot ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <Typography variant="body2" sx={{ lineHeight: 1.6, color: message.isBot ? 'inherit' : '#ffffff', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                            {message.text}
                        </Typography>
                    </Box>
                    {message.isBot && (
                        <Box sx={{
                            display: 'flex',
                            gap: 0.5,
                            mt: 0.75,
                            ml: 0.5,
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 1 }
                        }}>
                            <Tooltip title="Helpful" arrow placement="top">
                                <IconButton
                                    size="small"
                                    onClick={() => onFeedback(message.id, 'up')}
                                    sx={{
                                        p: 0.5,
                                        color: feedbackState === 'up' ? '#2563eb' : 'rgba(0,0,0,0.4)',
                                        '&:hover': {
                                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                                            color: '#2563eb'
                                        }
                                    }}
                                >
                                    {feedbackState === 'up' ? (
                                        <ThumbUpIcon sx={{ fontSize: 15 }} />
                                    ) : (
                                        <ThumbUpOutlinedIcon sx={{ fontSize: 15 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Not helpful" arrow placement="top">
                                <IconButton
                                    size="small"
                                    onClick={() => onFeedback(message.id, 'down')}
                                    sx={{
                                        p: 0.5,
                                        color: feedbackState === 'down' ? '#dc2626' : 'rgba(0,0,0,0.4)',
                                        '&:hover': {
                                            bgcolor: 'rgba(220, 38, 38, 0.08)',
                                            color: '#dc2626'
                                        }
                                    }}
                                >
                                    {feedbackState === 'down' ? (
                                        <ThumbDownIcon sx={{ fontSize: 15 }} />
                                    ) : (
                                        <ThumbDownOutlinedIcon sx={{ fontSize: 15 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={isCopied ? "Copied!" : "Copy"} arrow placement="top">
                                <IconButton
                                    size="small"
                                    onClick={() => onCopy(message.id, message.text)}
                                    sx={{
                                        p: 0.5,
                                        color: isCopied ? '#22c55e' : 'rgba(0,0,0,0.4)',
                                        '&:hover': {
                                            bgcolor: 'rgba(0,0,0,0.04)',
                                            color: isCopied ? '#22c55e' : 'rgba(0,0,0,0.6)'
                                        }
                                    }}
                                >
                                    {isCopied ? (
                                        <CheckIcon sx={{ fontSize: 15 }} />
                                    ) : (
                                        <ContentCopyIcon sx={{ fontSize: 15 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
            </Box>
        </Fade>
    );
};
