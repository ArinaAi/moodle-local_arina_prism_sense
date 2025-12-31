// components/layout/LeftColumn.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
}

const LeftColumn: React.FC<LeftColumnProps> = ({
  state,
  onOpenSourcesModal,
  onOpenCurriculumModal,
  onOpenVideoModal,
  dispatch,
  isMobile = false,
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
      }}
    >
      <CardContent sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        p: isMobile ? 1.5 : 2,
        '&:last-child': {
          pb: isMobile ? 1.5 : 2,
        }
      }}>
        {/* Header */}
        <Box sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" component="h2">
            Sources
          </Typography>
        </Box>

        {/* Add Source Button */}
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={onOpenSourcesModal}
          disabled={state.isGeneratingSlides}
          sx={{
            py: 1.75,
            fontWeight: 600,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
            transition: 'all 0.3s ease',
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

        {/* Info Box */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {renderSourcesContent()}
        </Box>

        {sources.length > 0 && <Divider sx={{ my: 2 }} />}

        {/* Content Type Dock with Improved Hierarchy */}
        <Box sx={{ mt: 'auto' }}>
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
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default LeftColumn;