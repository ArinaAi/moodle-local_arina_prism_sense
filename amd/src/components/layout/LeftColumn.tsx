// components/layout/LeftColumn.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
} from '@mui/material';
import { Add, Description, ExpandMore } from '@mui/icons-material';
import { FileUp, FileText } from 'lucide-react';
import ContentTypeDock from '../docks/ContentTypeDock';
import type { AppState, AppAction } from '../../types/app';

// Declare Moodle global
declare const M: { cfg: { wwwroot: string } };

interface SourceFile {
  id: number;
  filename: string;
  filesize: number;
  sectionid: number;
  sectionname: string;
  timecreated: number;
}

interface LeftColumnProps {
  state: AppState;
  onOpenSourcesModal: () => void;
  onOpenCurriculumModal: () => void;
  dispatch: React.Dispatch<AppAction>;
  isMobile?: boolean;
}

const LeftColumn: React.FC<LeftColumnProps> = ({
  state,
  onOpenSourcesModal,
  onOpenCurriculumModal,
  dispatch,
  isMobile = false,
}) => {
  const theme = useTheme();
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [_expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Load all sources for the course
  useEffect(() => {
    const loadAllSources = async () => {
      if (!state.moodleContext?.courseid) {
        return;
      }

      setLoadingSources(true);
      try {
        const response = await fetch(
          `${M.cfg.wwwroot}/local/lecturebot/api/get_sources.php?courseid=${state.moodleContext.courseid}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();
        if (data.success && data.sources) {
          setSources(data.sources);
        }
      } catch (error) {
        console.error('Error loading sources:', error);
      } finally {
        setLoadingSources(false);
      }
    };

    loadAllSources();
  }, [state.moodleContext?.courseid, state.showSourcesModal]); // Reload when modal closes

  // Auto-expand all sections initially
  useEffect(() => {
    const allSectionIds = Object.keys(groupedSources).map(Number);
    setExpandedSections(new Set(allSectionIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return bytes + ' B';
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.sectionid]) {
      acc[source.sectionid] = {
        sectionName: source.sectionname,
        files: []
      };
    }
    acc[source.sectionid].files.push(source);
    return acc;
  }, {} as Record<number, { sectionName: string; files: SourceFile[] }>);

  const renderSourcesContent = () => {
    if (loadingSources) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (sources.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            flex: 1,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <FileUp size={28} color="#2563eb" strokeWidth={2} />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
            Upload PDFs by Section
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Click &quot;Manage Sources&quot; to upload 1-3 PDFs per section
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Sources are organized by course sections
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
          Uploaded Sources ({sources.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Object.entries(groupedSources).map(([sectionId, { sectionName, files }]) => (
            <Accordion
              key={sectionId}
              onChange={() => {
                setExpandedSections((prev) => {
                  const newSet = new Set(prev);
                  const id = Number(sectionId);
                  if (newSet.has(id)) {
                    newSet.delete(id);
                  } else {
                    newSet.add(id);
                  }
                  return newSet;
                });
              }}
              sx={{
                border: `1px solid rgba(37, 99, 235, 0.3)`,
                borderRadius: '12px !important',
                backgroundColor: '#ffffffff',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(13, 92, 162, 0.15)',
                },
                '&.Mui-expanded': {
                  margin: 0,
                  marginBottom: '12px',
                },
                '&:focus': {
                  outline: 'none !important',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  minHeight: '48px',
                  '& .MuiAccordionSummary-content': {
                    margin: '8px 0',
                    alignItems: 'center',
                  },
                  '&:focus': {
                    outline: 'none !important',
                    boxShadow: 'none',
                  },
                  '&:focus-visible': {
                    outline: 'none !important',
                    boxShadow: 'none',
                  },
                  '&.Mui-focusVisible': {
                    backgroundColor: 'transparent',
                    outline: 'none !important',
                    boxShadow: 'none',
                  },
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    '&:focus': {
                      outline: 'none !important',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 1 }}>
                  <FileText size={18} color="#2563eb" strokeWidth={2.5} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sectionName}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
                <List sx={{ p: 0 }}>
                  {files.map((file, index) => (
                    <ListItem
                      key={file.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        mb: index < files.length - 1 ? 1 : 0,
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Description sx={{ fontSize: 20, color: '#64748b' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                          }}
                        >
                          {file.filename}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          {formatFileSize(file.filesize)}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobile ? 'auto' : 0,
      }}
    >
      <CardContent sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        p: 2,
        '&:last-child': {
          pb: 2,
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
            onSelectType={(type) =>
              dispatch({
                type: 'SET_ACTIVE_CONTENT_TYPE',
                payload: type as AppState['activeContentType'],
              })
            }
            onOpenCurriculumModal={onOpenCurriculumModal}
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