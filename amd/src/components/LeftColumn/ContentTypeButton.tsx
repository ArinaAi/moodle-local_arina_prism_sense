import React from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

export interface ContentTypeDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    description: string;
}

interface ContentTypeButtonProps {
    type: ContentTypeDefinition;
    activeType: string;
    disabled: boolean;
    tooltipTitle: string;
    onClick: (typeId: string) => void;
}

const getHoverStyles = (disabled: boolean, isActive: boolean, color: string) => {
    if (disabled) {
        return {
            backgroundColor: '#ffffff',
            border: '1px solid transparent',
            cursor: 'not-allowed',
            transform: 'none',
            boxShadow: 'none',
        };
    }

    return {
        backgroundColor: isActive ? `${color}20` : `${color}10`,
        border: `1px solid ${color}`,
        cursor: 'pointer',
        transform: isActive ? 'scale(1.03)' : 'translateX(4px)',
        boxShadow: isActive ? `0 6px 16px ${color}30` : 'none',
    };
};

const ContentTypeButton: React.FC<ContentTypeButtonProps> = ({
    type,
    activeType,
    disabled,
    tooltipTitle,
    onClick,
}) => {
    const Icon = type.icon;
    const isActive = activeType === type.id;
    const isComingSoon = type.id !== 'slide-deck' && type.id !== 'video';

    return (
        <Tooltip
            title={tooltipTitle}
            arrow
            placement="top"
            disableInteractive
            enterDelay={500}
            PopperProps={{
                sx: {
                    zIndex: 10006,
                },
            }}
        >
            <span>
                <Button
                    variant="text"
                    onClick={() => !disabled && onClick(type.id)}
                    disabled={disabled}
                    size="medium"
                    sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        border: isActive ? `1px solid ${type.color}` : '1px solid transparent',
                        backgroundColor: isActive ? `${type.color}15` : '#ffffff',
                        color: type.color,
                        borderRadius: '20px',
                        transition: 'all 0.3s ease',
                        '&:hover': getHoverStyles(disabled, isActive, type.color),
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        minHeight: '70px',
                        py: 'clamp(12px, 1.5vh, 16px)',
                        px: 'clamp(12px, 1.5vh, 16px)',
                    }}
                    fullWidth
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'clamp(12px, 1.5vh, 16px)',
                            width: '100%',
                        }}
                    >
                        <Icon size={24} color={type.color} strokeWidth={isActive ? 3 : 2} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: isActive ? 700 : 500,
                                    whiteSpace: 'normal',
                                    lineHeight: 1.2,
                                    textAlign: 'left',
                                    color: '#000000',
                                    opacity: isComingSoon ? 0.7 : 1,
                                }}
                            >
                                {type.label}
                            </Typography>

                            {isComingSoon && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.5rem',
                                        fontWeight: 700,
                                        color: '#e67300',
                                        backgroundColor: '#fff4e5',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        marginTop: '2px',
                                        border: '1px solid #ffeebb',
                                        letterSpacing: '0.3px',
                                        textTransform: 'uppercase',
                                        lineHeight: 1
                                    }}
                                >
                                    Coming Soon
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Button>
            </span>
        </Tooltip>
    );
};

export default ContentTypeButton;
