import React from 'react';
import { ThemeProvider } from '@mui/material';
import { createCMSTheme } from './config/theme';
import { DashboardLayout } from './layouts/DashboardLayout';

export const App: React.FC = () => {
    // Theme is now managed inside DashboardLayout (CSS variables approach)
    // MUI ThemeProvider kept for compatibility with any MUI components
    const theme = createCMSTheme('light');

    return (
        <ThemeProvider theme={theme}>
            <DashboardLayout />
        </ThemeProvider>
    );
};
