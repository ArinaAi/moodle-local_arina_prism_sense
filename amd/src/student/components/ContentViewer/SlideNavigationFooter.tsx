import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface SlideNavigationFooterProps {
    currentSlide: number;
    totalSlides: number;
    onNext: () => void;
    onPrev: () => void;
}

const SlideNavigationFooter: React.FC<SlideNavigationFooterProps> = ({ currentSlide, totalSlides, onNext, onPrev }) => {
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
            <Box sx={{ width: '100%', bgcolor: '#f1f5f9', height: 4 }}>
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
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Button
                    variant="outlined"
                    onClick={onPrev}
                    disabled={currentSlide === 0}
                    startIcon={<ChevronLeftIcon />}
                    sx={{
                        fontWeight: 600,
                        py: 1,
                        px: 3,
                        color: 'text.primary',
                        borderColor: 'rgba(0,0,0,0.12)',
                        borderWidth: 1,
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderWidth: 1,
                            borderColor: 'text.primary',
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            transform: 'translateY(-2px)',
                        },
                        '&.Mui-disabled': {
                            borderWidth: 1,
                            borderColor: 'rgba(0,0,0,0.06)'
                        }
                    }}
                >
                    Previous
                </Button>

                <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                    {currentSlide + 1} <span style={{ color: '#cbd5e1', margin: '0 8px' }}>/</span> {totalSlides}
                </Typography>

                <Button
                    variant="contained"
                    onClick={onNext}
                    disabled={currentSlide === totalSlides - 1}
                    endIcon={<ChevronRightIcon />}
                    sx={{
                        fontWeight: 600,
                        py: 1,
                        px: 4,
                        bgcolor: '#2563eb',
                        color: 'white',
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: '#1d4ed8',
                            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
                            transform: 'translateY(-2px)',
                        },
                    }}
                >
                    Next
                </Button>
            </Box>
        </Box>
    );
};

export default SlideNavigationFooter;
