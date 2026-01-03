import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import MainLayout from './components/Layout/MainLayout';
import { theme as sharedTheme } from '../theme/theme'; // Import shared theme but likely override for Gemini look

// Extend/Override theme for Gemini Look based on screenshot
const studentTheme = createTheme({
    ...sharedTheme,
    palette: {
        ...sharedTheme.palette,
        background: {
            default: '#f0f4f9', // Light bluish grey from screenshot
            paper: '#ffffff',
        },
        primary: {
            main: '#0b57d0', // Google Blue
        },
        text: {
            primary: '#1f1f1f',
            secondary: '#444746',
        }
    },
    shape: {
        borderRadius: 16, // Softer corners
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 20,
                    fontWeight: 500,
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: 'none', // Flat look usually, or very subtle
                }
            }
        }
    }
});

const StudentApp: React.FC = () => {
    return (
        <ThemeProvider theme={studentTheme}>
            <CssBaseline />
            <MainLayout />
        </ThemeProvider>
    );
};

export default StudentApp;
