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
    isCompact?: boolean;
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
        // Remove scale to prevent clipping - use shadow instead for depth effect
        transform: 'none',
        boxShadow: isActive ? `0 4px 12px ${color}30` : `0 2px 8px ${color}20`,
    };
};

const ContentTypeButton: React.FC<ContentTypeButtonProps> = ({
    type,
    activeType,
    disabled,
    tooltipTitle,
    onClick,
    isCompact = false,
}) => {
    const Icon = type.icon;
    const isActive = activeType === type.id;
    const isComingSoon = type.id !== 'slide-deck' && type.id !== 'video';

    // Icon size: Use numeric value. Scales based on compact mode and container size
    // For normal mode, we want larger icons on larger screens
    const iconSize = isCompact ? 20 : 24;

    // In compact mode, show the label in the tooltip instead
    // In normal mode, show full label with description for truncated text
    const effectiveTooltip = isCompact
        ? `${type.label}${isComingSoon ? ' (Coming Soon)' : ''}: ${tooltipTitle}`
        : `${type.label}${isComingSoon ? ' (Coming Soon)' : ''}: ${tooltipTitle}`;

    return (
        <Tooltip
            title={effectiveTooltip}
            arrow
            placement="top"
            disableInteractive
            enterDelay={300}
            enterTouchDelay={500}
            leaveTouchDelay={1500}
            PopperProps={{
                sx: {
                    zIndex: 100006,
                },
            }}
        >
            <span style={{ display: 'flex', height: '100%', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                <Button
                    variant="text"
                    onClick={() => !disabled && onClick(type.id)}
                    disabled={disabled}
                    size="small"
                    sx={{
                        justifyContent: isCompact ? 'center' : 'flex-start',
                        textTransform: 'none',
                        border: isActive ? `1px solid ${type.color}` : '1px solid transparent',
                        backgroundColor: isActive ? `${type.color}15` : '#ffffff',
                        color: type.color,
                        borderRadius: isCompact ? '12px' : '14px',
                        transition: 'all 0.2s ease',
                        '&:hover': getHoverStyles(disabled, isActive, type.color),
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        // Compact mode: smaller, square-ish buttons
                        // Normal mode: taller buttons that scale with container
                        minHeight: isCompact ? '44px' : 'clamp(52px, 16cqw, 64px)',
                        height: '100%',
                        width: '100%',
                        minWidth: 0, // Allow button to shrink
                        overflow: 'hidden',
                        // Use container query units for padding when not compact
                        py: isCompact ? '6px' : 'clamp(8px, 4cqw, 14px)',
                        px: isCompact ? '6px' : 'clamp(8px, 4cqw, 14px)',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    fullWidth
                >
                    {isCompact ? (
                        // Compact mode: Icon only, centered
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon
                                size={iconSize}
                                color={type.color}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                        </Box>
                    ) : (
                        // Normal mode: Icon + Label + Badge
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(8px, 4cqw, 14px)',
                                width: '100%',
                                minWidth: 0,
                            }}
                        >
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Icon
                                    size={iconSize}
                                    color={type.color}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </Box>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                minWidth: 0,
                                flex: 1
                            }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: isActive ? 700 : 500,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1.2,
                                        textAlign: 'left',
                                        color: '#000000',
                                        opacity: isComingSoon ? 0.7 : 1,
                                        width: '100%',
                                        // Container query based font sizing - larger on bigger screens
                                        fontSize: 'clamp(0.55rem, 5cqw, 0.85rem)',
                                    }}
                                >
                                    {type.label}
                                </Typography>

                                {isComingSoon && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            // Container query based font sizing
                                            fontSize: 'clamp(0.4rem, 3cqw, 0.6rem)',
                                            fontWeight: 700,
                                            color: '#e67300',
                                            backgroundColor: '#fff4e5',
                                            padding: '1px 3px',
                                            borderRadius: '2px',
                                            marginTop: '2px',
                                            border: '1px solid #ffeebb',
                                            letterSpacing: '0.2px',
                                            textTransform: 'uppercase',
                                            lineHeight: 1
                                        }}
                                    >
                                        Soon
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </Button>
            </span>
        </Tooltip >
    );
};

export default ContentTypeButton;
