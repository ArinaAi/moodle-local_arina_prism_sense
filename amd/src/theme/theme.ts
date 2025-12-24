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
        '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)', // 1
        '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', // 2
        '0 10px 15px -3px rgba(0,0,0,0.03), 0 4px 6px -2px rgba(0,0,0,0.01)', // 3
        '0 20px 25px -5px rgba(0,0,0,0.03), 0 10px 10px -5px rgba(0,0,0,0.01)', // 4
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 5
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 6 (Repeat for now or customize)
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 7
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 8
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 9
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 10
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 11
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 12
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 13
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 14
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 15
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 16
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 17
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 18
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 19
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 20
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 21
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 22
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 23
        '0 25px 50px -12px rgba(0,0,0,0.08)', // 24
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
