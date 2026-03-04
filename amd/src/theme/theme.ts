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
        // Level 1 — Cards at rest (blueprint §3.4)
        '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        // Level 2 — Cards on hover
        '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        // Level 3 — Dropdowns, popovers
        '0 8px 24px rgba(0,0,0,0.12)',
        // Level 4 — Modals (used for all elevations 4+)
        '0 16px 48px rgba(0,0,0,0.16)',
        '0 16px 48px rgba(0,0,0,0.16)', // 5
        '0 16px 48px rgba(0,0,0,0.16)', // 6
        '0 16px 48px rgba(0,0,0,0.16)', // 7
        '0 16px 48px rgba(0,0,0,0.16)', // 8
        '0 16px 48px rgba(0,0,0,0.16)', // 9
        '0 16px 48px rgba(0,0,0,0.16)', // 10
        '0 16px 48px rgba(0,0,0,0.16)', // 11
        '0 16px 48px rgba(0,0,0,0.16)', // 12
        '0 16px 48px rgba(0,0,0,0.16)', // 13
        '0 16px 48px rgba(0,0,0,0.16)', // 14
        '0 16px 48px rgba(0,0,0,0.16)', // 15
        '0 16px 48px rgba(0,0,0,0.16)', // 16
        '0 16px 48px rgba(0,0,0,0.16)', // 17
        '0 16px 48px rgba(0,0,0,0.16)', // 18
        '0 16px 48px rgba(0,0,0,0.16)', // 19
        '0 16px 48px rgba(0,0,0,0.16)', // 20
        '0 16px 48px rgba(0,0,0,0.16)', // 21
        '0 16px 48px rgba(0,0,0,0.16)', // 22
        '0 16px 48px rgba(0,0,0,0.16)', // 23
        '0 16px 48px rgba(0,0,0,0.16)', // 24
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
