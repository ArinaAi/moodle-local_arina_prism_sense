import React from 'react';
import { Box, Typography, Button, useTheme, useMediaQuery, Skeleton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SlideThumbnails from './SlideThumbnails';
import { SlideImage } from './useContentSlides';

interface SlideNavigationFooterProps {
    currentSlide: number;
    totalSlides: number;
    onNext: () => void;
    onPrev: () => void;
    slides?: SlideImage[];
    onSlideClick?: (index: number) => void;
    isLoading?: boolean;
}

// Helper function for responsive styles (moved outside to reduce complexity)
const getNavStyles = (isMobile: boolean) => ({
    progressHeight: 'clamp(2px, 0.3vw, 3px)',
    padding: 'clamp(8px, 1.2vw, 12px)',
    prevPx: 'clamp(12px, 2vw, 20px)',
    nextPx: 'clamp(12px, 2.5vw, 24px)',
    touchTarget: {
        minHeight: 'clamp(32px, 5vw, 40px)',
        minWidth: 'clamp(32px, 5vw, 40px)',
    },
    fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
    labelFontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
    separatorMargin: '0 clamp(4px, 0.5vw, 6px)',
    hoverTransform: 'translateY(-1px)',
    showIcons: !isMobile,
});

const SlideNavigationFooter: React.FC<SlideNavigationFooterProps> = ({
    currentSlide,
    totalSlides,
    onNext,
    onPrev,
    slides = [],
    onSlideClick,
    isLoading = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Use external helper function
    const styles = getNavStyles(isMobile);

    if (isLoading) {
        return (
            <Box sx={{
                bgcolor: 'white',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                position: 'relative',
                zIndex: 2,
                flexShrink: 1,
                minHeight: 'clamp(40px, 8vh, 60px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                opacity: 0.7,
            }}>
                {/* Thin progress bar skeleton */}
                <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: styles.progressHeight }} />

                <Box sx={{
                    p: styles.padding,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                }}>
                    <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} animation="wave" />
                    <Skeleton variant="text" width={40} height={20} animation="wave" />
                    <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.4)' }} animation="wave" />
                </Box>

                {/* Strip of thumbnail skeletons */}
                <Box sx={{
                    display: 'flex',
                    gap: '8px',
                    px: styles.padding,
                    pb: styles.padding,
                    overflow: 'hidden'
                }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Box key={`thumb-skel-${i}`} sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Skeleton
                                variant="rectangular"
                                width={isMobile ? 80 : 120}
                                height={isMobile ? 45 : 68}
                                animation="wave"
                                sx={{
                                    borderRadius: 1,
                                    border: i === 1 ? '2px solid rgba(37, 99, 235, 0.4)' : '1px solid rgba(0,0,0,0.08)'
                                }}
                            />
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }

    if (totalSlides === 0) {
        return null;
    }

    return (
        <Box sx={{
            bgcolor: 'white',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            position: 'relative',
            zIndex: 2,
            flexShrink: 1, // Allow footer to participate in flex shrinking
            minHeight: 'clamp(40px, 8vh, 60px)', // Minimum height that scales with viewport
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // Prevent content overflow when shrinking
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

            {/* Thumbnail strip */}
            {slides.length > 0 && onSlideClick && (
                <SlideThumbnails
                    slides={slides}
                    currentSlide={currentSlide}
                    onSlideClick={onSlideClick}
                />
            )}
        </Box>
    );
};

export default SlideNavigationFooter;

