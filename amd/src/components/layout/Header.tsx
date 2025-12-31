import React from 'react';
import { Box, Typography } from '@mui/material';
import type { MoodleContext } from '../../types/moodle';

interface HeaderProps {
    moodleContext: MoodleContext;
}

const Header: React.FC<HeaderProps> = ({ moodleContext }) => {
    if (!moodleContext) return null;

    return (
        <Box
            component="header"
            sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight transparency
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                zIndex: 10,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                    onClick={() => window.location.href = `${moodleContext.wwwroot}/course/view.php?id=${moodleContext.courseid}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: 0,
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                        e.currentTarget.style.borderColor = '#dee2e6';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e9ecef';
                    }}
                    title="Back to course"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0f6cbf"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <Box>
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                        }}
                    >
                        {moodleContext.coursename}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        AI-Powered Lecture Builder
                    </Typography>
                </Box>
            </Box>
            <Box
                component="img"
                src={`${moodleContext.wwwroot}/local/lecturebot/pix/arina-logo.png`}
                alt="Arina AI"
                sx={{
                    height: 60,
                    width: 'auto',
                    objectFit: 'contain',
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                }}
            />
        </Box>
    );
};

export default Header;
