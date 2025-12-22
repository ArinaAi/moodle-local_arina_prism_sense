import { createTheme } from '@mui/material';

// Create theme matching Moodle with clean design system
export const theme = createTheme({
    palette: {
        primary: {
            main: '#0f6cbf', // Original Moodle Blue
            dark: '#0a5a9d',
            light: '#3d8fd1',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#6c757d',
            dark: '#5a6268',
            light: '#8c959d',
            contrastText: '#ffffff',
        },
        success: {
            main: '#28a745', 
            light: '#48c774',
            dark: '#208537',
        },
        error: {
            main: '#dc3545',
            light: '#e15361',
            dark: '#c82333',
        },
        warning: {
            main: '#ffc107',
            light: '#ffd54f',
            dark: '#ffa000',
        },
        info: {
            main: '#17a2b8',
            light: '#3ab5c6',
            dark: '#117a8b',
        },
        background: {
            default: '#ffffff', // Standard White
            paper: '#f8f9fa',
        },
        text: {
            primary: '#1a1a1a',
            secondary: '#6c757d',
        },
        divider: '#e9ecef',
    },
    typography: {
        fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
            fontSize: '1.75rem',
            lineHeight: 1.3,
            color: '#1a1a1a',
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.5rem',
            lineHeight: 1.3,
            color: '#1a1a1a',
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.25rem',
            lineHeight: 1.4,
            color: '#1a1a1a',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
            color: '#1a1a1a',
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: '#6c757d',
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
            color: '#868e96',
        },
    },
    shape: {
        borderRadius: 20,
    },
    shadows: [
        'none',
        '0 1px 2px rgba(0,0,0,0.04)',
        '0 2px 4px rgba(0,0,0,0.06)',
        '0 3px 6px rgba(0,0,0,0.08)',
        '0 4px 8px rgba(0,0,0,0.1)',
        '0 5px 10px rgba(0,0,0,0.12)',
        '0 6px 12px rgba(0,0,0,0.14)',
        '0 7px 14px rgba(0,0,0,0.16)',
        '0 8px 16px rgba(0,0,0,0.18)',
        '0 9px 18px rgba(0,0,0,0.2)',
        '0 10px 20px rgba(0,0,0,0.22)',
        '0 12px 24px rgba(0,0,0,0.24)',
        '0 14px 28px rgba(0,0,0,0.26)',
        '0 16px 32px rgba(0,0,0,0.28)',
        '0 18px 36px rgba(0,0,0,0.3)',
        '0 20px 40px rgba(0,0,0,0.32)',
        '0 24px 48px rgba(0,0,0,0.34)',
        '0 28px 56px rgba(0,0,0,0.36)',
        '0 32px 64px rgba(0,0,0,0.38)',
        '0 36px 72px rgba(0,0,0,0.4)',
        '0 40px 80px rgba(0,0,0,0.42)',
        '0 44px 88px rgba(0,0,0,0.44)',
        '0 48px 96px rgba(0,0,0,0.46)',
        '0 52px 104px rgba(0,0,0,0.48)',
        '0 56px 112px rgba(0,0,0,0.5)',
    ],
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #e9ecef',
                    borderRadius: 20,
                    overflow: 'visible',
                    background: '#f8f9fa',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 20,
                    minHeight: '40px',
                    padding: '8px 16px',
                },
                outlined: {
                    borderWidth: 1,
                    '&:hover': {
                        borderWidth: 1,
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 20,
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                rounded: {
                    borderRadius: 20,
                },
            },
        },
    },
});
