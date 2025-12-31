// components/Layout/MainLayout.tsx
import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import MobileLayout from './MobileLayout';
import TabletLayout from './TabletLayout';
import DesktopLayout from './DesktopLayout';
import type { LayoutProps } from '../../types/layout';

// Re-export props if needed, or just use LayoutProps
interface MainLayoutProps extends LayoutProps { }

const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // 600px - 1200px

  if (isMobile) {
    return <MobileLayout {...props} />;
  }

  if (isTablet) {
    return <TabletLayout {...props} />;
  }

  return <DesktopLayout {...props} />;
};

export default MainLayout;