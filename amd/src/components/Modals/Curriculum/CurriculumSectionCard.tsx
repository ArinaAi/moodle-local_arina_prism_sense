import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Radio,
  Collapse,
  CircularProgress,
  Fade,
} from '@mui/material';
import { WarningAmber, CheckCircle, Add } from '@mui/icons-material';
import { FileText } from 'lucide-react';
import { DebouncedTextField } from '../../Core/DebouncedTextField';
import type { SectionWithSources } from '../../../hooks/useCurriculumData';

export interface CurriculumSectionCardProps {
  section: SectionWithSources;
  index: number;
  selectedSectionId: number | null;
  setSelectedSectionId: (id: number | null) => void;
  addingCurriculumSectionId: number | null;
  setAddingCurriculumSectionId: (id: number | null) => void;
  newCurriculumText: string;
  setNewCurriculumText: (text: string) => void;
  saveCurriculumError: string;
  setSaveCurriculumError: (error: string) => void;
  isSavingCurriculum: boolean;
  handlePreviewCurriculum: (id: number) => void;
  handleOpenAddCurriculum: (e: React.MouseEvent, id: number) => void;
  handleSaveCurriculum: (e: React.MouseEvent, id: number) => void;
}

export const CurriculumSectionCard = React.memo<CurriculumSectionCardProps>(({
  section,
  index,
  selectedSectionId,
  setSelectedSectionId,
  addingCurriculumSectionId,
  setAddingCurriculumSectionId,
  newCurriculumText,
  setNewCurriculumText,
  saveCurriculumError,
  setSaveCurriculumError,
  isSavingCurriculum,
  handlePreviewCurriculum,
  handleOpenAddCurriculum,
  handleSaveCurriculum,
}) => {
  const missingCurriculum = section.curriculumChecked && section.hasCurriculum === false;
  const isSelected = selectedSectionId === section.id;

  return (
    <Fade in timeout={300 + index * 100}>
      <Card
        onClick={() => {
          if (!missingCurriculum) {
            setSelectedSectionId(section.id);
          }
        }}
        sx={{
          border: missingCurriculum
            ? '2px solid #e9ecef'
            : isSelected
            ? '2px solid #0f6cbf'
            : '2px solid #e9ecef',
          borderRadius: '12px',
          transition:
            'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: missingCurriculum
            ? '#fafafa'
            : isSelected
            ? 'rgba(15, 108, 191, 0.05)'
            : 'white',
          boxShadow: isSelected && !missingCurriculum ? '0 4px 12px rgba(15, 108, 191, 0.15)' : 'none',
          cursor: missingCurriculum ? 'not-allowed' : 'pointer',
          opacity: missingCurriculum ? 0.65 : 1,
          '&:hover': missingCurriculum
            ? {}
            : {
                borderColor: '#0f6cbf',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(15, 108, 191, 0.18)',
              },
          '&:active': missingCurriculum ? {} : { transform: 'scale(0.98)' },
        }}
      >
        <CardContent sx={{ p: 'clamp(16px, 2vw + 12px, 24px)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5vw + 8px, 20px)' }}>
            {/* Icon */}
            <Box
              sx={{
                width: 'clamp(40px, 4vw + 24px, 48px)',
                height: 'clamp(40px, 4vw + 24px, 48px)',
                borderRadius: '12px',
                bgcolor: missingCurriculum
                  ? 'rgba(200, 200, 200, 0.3)'
                  : isSelected
                  ? '#0f6cbf'
                  : 'rgba(15, 108, 191, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.2s ease',
              }}
            >
              {isSelected && !missingCurriculum ? (
                <CheckCircle sx={{ color: 'white', fontSize: 'clamp(24px, 2.5vw + 14px, 28px)' }} />
              ) : missingCurriculum ? (
                <WarningAmber sx={{ color: '#b45309', fontSize: 'clamp(20px, 2vw + 12px, 24px)' }} />
              ) : (
                <FileText
                  color="#0f6cbf"
                  strokeWidth={2.5}
                  style={{ width: 'clamp(20px, 2vw + 12px, 24px)', height: 'clamp(20px, 2vw + 12px, 24px)' }}
                />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: missingCurriculum ? '#6c757d' : isSelected ? '#0f6cbf' : '#1a1a1a',
                  mb: 'clamp(4px, 0.5vw + 2px, 8px)',
                  fontSize: 'clamp(0.95rem, 1vw + 0.75rem, 1.05rem)',
                  lineHeight: 1.3,
                }}
              >
                {section.name}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={`${section.sourceCount} PDF${section.sourceCount === 1 ? '' : 's'}`}
                  size="small"
                  sx={{
                    bgcolor: missingCurriculum ? 'rgba(0,0,0,0.06)' : 'rgba(13, 92, 162, 0.1)',
                    color: missingCurriculum ? '#6c757d' : '#0D5CA2',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />

                {/* Show View Curriculum only when curriculum exists */}
                {!missingCurriculum && section.curriculum && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handlePreviewCurriculum(section.id);
                    }}
                    sx={{
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      minWidth: 'auto',
                      padding: '2px 8px',
                      fontWeight: 600,
                      borderRadius: 2,
                      border: '1px solid #0f6cbf',
                      '&:hover': {
                        bgcolor: 'rgba(15, 108, 191, 0.1)',
                      },
                    }}
                  >
                    View Curriculum
                  </Button>
                )}

                {/* Inline "Add Curriculum" button when curriculum is missing */}
                {missingCurriculum && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Add sx={{ fontSize: '0.9rem !important' }} />}
                    onClick={(e) => handleOpenAddCurriculum(e, section.id)}
                    sx={{
                      fontSize: '0.72rem',
                      textTransform: 'none',
                      minWidth: 'auto',
                      padding: '2px 8px',
                      fontWeight: 600,
                      borderRadius: 2,
                      color: '#b45309',
                      borderColor: '#d97706',
                      '&:hover': {
                        bgcolor: 'rgba(217, 119, 6, 0.08)',
                        borderColor: '#b45309',
                      },
                    }}
                  >
                    Add Curriculum
                  </Button>
                )}
              </Box>
            </Box>

            {/* Radio — disabled for missing curriculum */}
            <Radio
              checked={isSelected}
              disabled={missingCurriculum}
              value={section.id}
              sx={{
                color: '#adb5bd',
                '&.Mui-checked': { color: '#0f6cbf' },
                '&:focus': { outline: 'none !important' },
              }}
            />
          </Box>

          {/* Inline Add Curriculum panel — expands below the card row */}
          <Collapse in={addingCurriculumSectionId === section.id} timeout={250} unmountOnExit>
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: '1px solid #f0e8d8',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
                Paste or type the curriculum for this section:
              </Typography>
              <DebouncedTextField
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                placeholder="e.g. Week 1: Introduction to...&#10;Week 2: Core concepts of..."
                value={newCurriculumText}
                onChange={(e) => {
                  setNewCurriculumText(e.target.value);
                  if (saveCurriculumError) {
                    setSaveCurriculumError('');
                  }
                }}
                disabled={isSavingCurriculum}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    '& fieldset': { borderColor: '#d97706' },
                    '&:hover fieldset': { borderColor: '#b45309' },
                    '&.Mui-focused fieldset': { borderColor: '#b45309' },
                  },
                }}
              />
              {saveCurriculumError && (
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500 }}>
                  {saveCurriculumError}
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  size="small"
                  variant="text"
                  disabled={isSavingCurriculum}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddingCurriculumSectionId(null);
                    setNewCurriculumText('');
                    setSaveCurriculumError('');
                  }}
                  sx={{ fontSize: '0.78rem', textTransform: 'none', color: 'text.secondary' }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={isSavingCurriculum || !newCurriculumText.trim()}
                  onClick={(e) => handleSaveCurriculum(e, section.id)}
                  sx={{
                    fontSize: '0.78rem',
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: '#b45309',
                    '&:hover': { bgcolor: '#92400e' },
                    '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)' },
                    minWidth: 120,
                  }}
                >
                  {isSavingCurriculum ? (
                    <CircularProgress size={14} sx={{ color: 'white', mr: 1 }} />
                  ) : null}
                  {isSavingCurriculum ? 'Saving…' : 'Save & Add'}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Fade>
  );
}, (prevProps, nextProps) => {
  const isCurrentlyAdding = nextProps.addingCurriculumSectionId === nextProps.section.id;
  const wasCurrentlyAdding = prevProps.addingCurriculumSectionId === prevProps.section.id;
  const isSelected = nextProps.selectedSectionId === nextProps.section.id;
  const wasSelected = prevProps.selectedSectionId === prevProps.section.id;

  if (isCurrentlyAdding || wasCurrentlyAdding) {
    // If it was open or is open, we need to respect changes to text/error states
    return (
      prevProps.section === nextProps.section &&
      isCurrentlyAdding === wasCurrentlyAdding &&
      isSelected === wasSelected &&
      prevProps.newCurriculumText === nextProps.newCurriculumText &&
      prevProps.saveCurriculumError === nextProps.saveCurriculumError &&
      prevProps.isSavingCurriculum === nextProps.isSavingCurriculum
    );
  }

  // Otherwise, it only cares if its selection state changed or its section definition changed
  return (
    prevProps.section === nextProps.section &&
    isSelected === wasSelected
  );
});

CurriculumSectionCard.displayName = 'CurriculumSectionCard';
