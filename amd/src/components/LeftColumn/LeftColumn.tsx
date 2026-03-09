// components/layout/LeftColumn.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tooltip,
  useTheme,
  Divider,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import ContentTypeDock from './ContentTypeDock';
import type { AppState, AppAction } from '../../types/app';
import { useSources } from '../../hooks/useSources';
import SourceLoadingState from './SourceLoadingState';
import SourceEmptyState from './SourceEmptyState';
import SourcesList from './SourcesList';

interface LeftColumnProps {
  state: AppState;
  onOpenSourcesModal: () => void;
  onOpenCurriculumModal: () => void;
  onOpenVideoModal: () => void;
  dispatch?: React.Dispatch<AppAction>;
  isMobile?: boolean;
  hasCredits?: boolean;
  creditTooltip?: string;
}

const LeftColumn: React.FC<LeftColumnProps> = ({
  state,
  onOpenSourcesModal,
  onOpenCurriculumModal,
  onOpenVideoModal,
  dispatch,
  isMobile = false,
  hasCredits = true,
  creditTooltip = '',
}) => {
  const theme = useTheme();

  // Use the custom hook for data fetching
  const { sources, loadingSources } = useSources(state.moodleContext, state.showSourcesModal);

  const renderSourcesContent = () => {
    if (loadingSources) {
      return <SourceLoadingState />;
    }

    if (sources.length === 0) {
      return <SourceEmptyState />;
    }

    return <SourcesList sources={sources} />;
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobile ? 'auto' : 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        overflow: 'visible', // Allow dock button borders to show
      }}
    >
      <CardContent sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 1vh, 12px)',
        height: '100%',
        p: 'clamp(12px, 1vh, 16px)',
        overflow: 'visible', // Allow dock borders to show
        '&:last-child': {
          pb: 'clamp(12px, 1vh, 16px)',
        }
      }}>
        {/* Header */}
        <Box sx={{
          pb: 'clamp(12px, 1.5vh, 16px)',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            component="h2"
            sx={{ fontWeight: 600 }}
          >
            Sources
          </Typography>
        </Box>

        {/* Add Source Button */}
        <Tooltip title={!hasCredits ? creditTooltip : ''} arrow placement="top">
          <span>
            <Button
              variant="contained"
              size={isMobile ? 'medium' : 'large'}
              startIcon={<Add />}
              onClick={onOpenSourcesModal}
              disabled={state.isGeneratingSlides || !hasCredits}
              sx={{
                py: 'clamp(8px, 1.25vh, 12px)',
                px: 'clamp(12px, 2vw, 20px)',
                fontSize: 'clamp(0.75rem, 1vw + 0.6rem, 1rem)',
                fontWeight: 700,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
                transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.15s cubic-bezier(0.2, 0, 0, 1)',
                // Allow button to shrink and content to wrap if needed
                minWidth: 0,
                whiteSpace: 'normal',
                lineHeight: 1.1,
                // Ensure minimum touch target on mobile
                minHeight: isMobile ? '44px' : 'auto',
                '& .MuiButton-startIcon': {
                  marginRight: 'clamp(4px, 1vw, 8px)',
                  '& svg': {
                    fontSize: 'clamp(18px, 2.5vw, 24px)'
                  }
                },
                '&:hover': {
                  background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                  boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
              fullWidth
            >
              Manage Sources
            </Button>
          </span>
        </Tooltip>

        {/* Sources List Area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1vh, 12px)',
            flex: 1,
            minHeight: '180px', // Guarantee space for sources
            overflow: 'auto',
            // Better scroll performance
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {renderSourcesContent()}
        </Box>

        {sources.length > 0 && <Divider sx={{ my: 'clamp(12px, 1.5vh, 16px)' }} />}

        {/* Content Type Dock with Improved Hierarchy */}
        <Box sx={{ mt: 'auto', flexShrink: 0, overflow: 'visible' }}>
          <ContentTypeDock
            activeType={state.activeContentType}
            onSelectType={(type: string) =>
              dispatch?.({
                type: 'SET_ACTIVE_CONTENT_TYPE',
                payload: type as AppState['activeContentType'],
              })
            }
            onOpenCurriculumModal={onOpenCurriculumModal}
            onOpenVideoModal={onOpenVideoModal}
            isGeneratingSlides={state.isGeneratingSlides}
            hasSlides={!!state.generatedSlides || !!state.generatedContent}
            hasSources={true}
            isMobile={isMobile}
            hasCredits={hasCredits}
            creditTooltip={creditTooltip}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default LeftColumn;