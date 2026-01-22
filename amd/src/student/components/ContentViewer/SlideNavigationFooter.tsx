import React from 'react';
import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface SlideNavigationFooterProps {
    currentSlide: number;
    totalSlides: number;
    onNext: () => void;
    onPrev: () => void;
}

// Helper function for responsive styles (moved outside to reduce complexity)
// Helper function for responsive styles (moved outside to reduce complexity)
const getNavStyles = (isMobile: boolean) => ({
    progressHeight: 'clamp(2px, 0.3vw, 3px)',
    padding: 'clamp(4px, 0.8vw, 8px)',
    prevPx: 'clamp(6px, 1.5vw, 12px)',
    nextPx: 'clamp(6px, 2vw, 16px)',
    touchTarget: {
        minHeight: 'clamp(24px, 4vw, 32px)',
        minWidth: 'clamp(24px, 4vw, 32px)',
    },
    fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
    labelFontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
    separatorMargin: '0 clamp(2px, 0.3vw, 4px)',
    hoverTransform: 'translateY(-1px)',
    showIcons: !isMobile,
});

const SlideNavigationFooter: React.FC<SlideNavigationFooterProps> = ({ currentSlide, totalSlides, onNext, onPrev }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use external helper function
    const styles = getNavStyles(isMobile);

    if (totalSlides === 0) {
        return null;
    }

    return (
        <Box sx={{
            bgcolor: 'white',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            position: 'relative',
            zIndex: 2
        }}>
            {/* Linear Progress Bar */}
            <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: styles.progressHeight }}>
                <Box sx={{
                    height: '100%',
                    width: `${((currentSlide + 1) / totalSlides) * 100}%`,
                    bgcolor: '#2563eb',
                    transition: 'width 0.3s ease',
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4
                }} />
            </Box>

            <Box sx={{
                p: styles.padding,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
            }}>
                <Button
                    variant="outlined"
                    onClick={onPrev}
                    disabled={currentSlide === 0}
                    startIcon={styles.showIcons && <ChevronLeftIcon />}
                    sx={{
                        fontWeight: 600,
                        py: 0.5,
                        px: styles.prevPx,
                        ...styles.touchTarget,
                        fontSize: styles.fontSize,
                        color: 'text.primary',
                        borderColor: 'rgba(0,0,0,0.12)',
                        borderWidth: 1,
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderWidth: 1,
                            borderColor: 'text.primary',
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            transform: styles.hoverTransform,
                        },
                        '&.Mui-disabled': {
                            borderWidth: 1,
                            borderColor: 'rgba(0,0,0,0.06)'
                        }
                    }}
                >
                    {styles.showIcons ? 'Previous' : <ChevronLeftIcon />}
                </Button>

                <Typography sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    fontSize: styles.labelFontSize,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                }}>
                    {currentSlide + 1} <span style={{ color: '#cbd5e1', margin: styles.separatorMargin }}>/</span> {totalSlides}
                </Typography>

                <Button
                    variant="contained"
                    onClick={onNext}
                    disabled={currentSlide === totalSlides - 1}
                    endIcon={styles.showIcons && <ChevronRightIcon />}
                    sx={{
                        fontWeight: 600,
                        py: 0.5,
                        px: styles.nextPx,
                        ...styles.touchTarget,
                        fontSize: styles.fontSize,
                        bgcolor: '#2563eb',
                        color: 'white',
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: '#1d4ed8',
                            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
                            transform: styles.hoverTransform,
                        },
                    }}
                >
                    {styles.showIcons ? 'Next' : <ChevronRightIcon />}
                </Button>
            </Box>
        </Box>
    );
};

export default SlideNavigationFooter;

