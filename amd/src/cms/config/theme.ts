import { createTheme } from '@mui/material/styles';

// ── CSS Variable Tokens (Blueprint §12) ──────────────────────
// Applied to root element via useEffect in DashboardLayout
export const THEMES = {
    light: {
        '--paper': '#ffffff',
        '--bg': '#DCE3EE',
        '--border': '#e2e8f0',
        '--tp': '#0f1923',
        '--ts': '#4a5568',
        '--td': '#a0aec0',
        '--rh': 'rgba(15,108,191,0.04)',
        '--blur': 'none',
        '--shadow': '0 2px 12px rgba(15,40,80,0.08)',
    },
    dark: {
        '--paper': 'rgba(22,27,34,0.6)',
        '--bg': '#060d1a',
        '--border': 'rgba(255,255,255,0.08)',
        '--tp': '#f0f6fc',
        '--ts': '#8b949e',
        '--td': '#6e7681',
        '--rh': 'rgba(255,255,255,0.03)',
        '--blur': 'blur(24px) saturate(160%)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.3)',
    },
} as const;

export type ThemeName = keyof typeof THEMES;

// ── Color Palette (Blueprint §3.1) ───────────────────────────
const customPalette = {
    primary: {
        main: '#0f6cbf',       // Primary CTA, active nav, brand
        light: '#3d8fd1',      // Subtle tints, focus rings
        dark: '#084C86',       // Button pressed, active
        contrastText: '#FFFFFF',
    },
    secondary: {
        main: '#E0E9F3',
        light: '#F0F5FA',
        dark: '#C5D5E5',
        contrastText: '#0f1923',
    },
    success: {
        main: '#28a745',       // Active badges, positive amounts
        light: '#48c774',
        dark: '#1E7E34',
        contrastText: '#FFFFFF',
    },
    warning: {
        main: '#FD7E14',       // Consumption badges
        light: '#FF9933',
        dark: '#E56B0F',
        contrastText: '#FFFFFF',
    },
    error: {
        main: '#E83E8C',       // Negative amounts, critical
        light: '#FF5BA0',
        dark: '#D02570',
        contrastText: '#FFFFFF',
    },
    info: {
        main: '#20C997',       // Teal accents
        light: '#38D9A9',
        dark: '#1BA67A',
        contrastText: '#FFFFFF',
    },
    background: {
        default: '#DCE3EE',    // Page bg (aurora gradient overlaid via CSS)
        paper: '#ffffff',      // Cards, panels, sidebar, header
    },
    text: {
        primary: '#0f1923',
        secondary: '#4a5568',
    },
};

// Dark mode palette
const darkPalette = {
    ...customPalette,
    background: {
        default: '#060d1a',
        paper: 'rgba(22,27,34,0.6)',
    },
    text: {
        primary: '#f0f6fc',
        secondary: '#8b949e',
    },
};

// ── MUI Theme Factory ────────────────────────────────────────
export const createCMSTheme = (mode: 'light' | 'dark' = 'light') => createTheme({
    palette: {
        mode,
        ...(mode === 'light' ? customPalette : darkPalette),
        custom: {
            purple: '#6F42C1',
        },
    },
    typography: {
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.01em' },
        h4: { fontWeight: 600, letterSpacing: '-0.01em' },
        h5: { fontWeight: 600, letterSpacing: '0em' },
        h6: { fontWeight: 600, letterSpacing: '0em' },
        body1: { fontWeight: 400 },
        body2: { fontWeight: 400 },
        button: {
            fontWeight: 600,
            textTransform: 'none',
        },
        caption: {
            fontWeight: 500,
            fontFeatureSettings: '"tnum"',
        },
    },
    shape: {
        borderRadius: 20,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                elevation1: {
                    boxShadow: '0 2px 12px rgba(15,40,80,0.08)',
                },
                elevation2: {
                    boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    padding: '10px 20px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:active': {
                        transform: 'scale(0.98)',
                    },
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(15,108,191,0.25)',
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                },
            },
        },
        // Skeleton: visible in both light and dark mode (blueprint §6.11)
        MuiSkeleton: {
            styleOverrides: {
                root: ({ _ownerState, theme: t }: any) => ({
                    backgroundColor: t.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(15,40,80,0.06)',
                    '&::after': {
                        background: t.palette.mode === 'dark'
                            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                    },
                }),
            },
        },
    },
});

// Extend the MUI theme interface to include custom colors
declare module '@mui/material/styles' {
    interface Palette {
        custom: {
            purple: string;
        };
    }
    interface PaletteOptions {
        custom?: {
            purple?: string;
        };
    }
}
