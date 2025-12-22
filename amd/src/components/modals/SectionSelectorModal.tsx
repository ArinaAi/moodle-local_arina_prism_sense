// components/modals/SectionSelectorModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Typography,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { MoodleSection } from '../../types/moodle';

interface SectionSelectorModalProps {
  open: boolean;
  sections: MoodleSection[];
  onClose: () => void;
  onSelectSection: (sectionId: number) => void;
}

// Helper function to decode HTML entities
const decodeHtml = (html: string): string => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

const SectionSelectorModal: React.FC<SectionSelectorModalProps> = ({
  open,
  sections,
  onClose,
  onSelectSection,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedSectionId !== null) {
      onSelectSection(selectedSectionId);
      setSelectedSectionId(null);
    }
  };

  const handleClose = () => {
    setSelectedSectionId(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      disablePortal={false}
      container={() => document.body}
      sx={{
        zIndex: 1400,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: 600 },
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '2px solid #ffffff',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#1a1a1a',
                mb: 0.5,
              }}
            >
              Publish Slides
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
              Select where you want to add your slides in the course
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: '12px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            p: 3,
            overflowY: 'auto',
            flexGrow: 1,
            backgroundColor: '#ffffff',
          }}
        >
          {sections.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                color: '#6c757d',
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                No sections available in this course.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please create a section first.
              </Typography>
            </Box>
          ) : (
            <RadioGroup
              value={selectedSectionId?.toString() || ''}
              onChange={(e) => setSelectedSectionId(Number(e.target.value))}
            >
              {sections.map((section, index) => (
                <Box
                  key={section.id}
                  sx={{
                    p: 2,
                    backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#e9ecef',
                    },
                  }}
                  onClick={() => setSelectedSectionId(section.id)}
                >
                  <FormControlLabel
                    value={section.id.toString()}
                    control={
                      <Radio
                        sx={{
                          color: '#0f6cbf',
                          '&.Mui-checked': {
                            color: '#0f6cbf',
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: '#1a1a1a',
                          }}
                        >
                          {decodeHtml(section.name)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6c757d',
                            mt: 0.5,
                          }}
                        >
                          Section {section.section}
                        </Typography>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </Box>
              ))}
            </RadioGroup>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 3,
            borderTop: '2px solid #ffffff',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={selectedSectionId === null || sections.length === 0}
            sx={{
              fontWeight: 700,
              py: 1.5,
              px: 4,
              background: 'linear-gradient(135deg, #0f6cbf 0%, #0a5a9d 100%)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #0a5a9d 0%, #084a82 100%)',
                boxShadow: '0 6px 20px rgba(15, 108, 191, 0.4)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e',
                transform: 'none',
                boxShadow: 'none',
              },
            }}
          >
            Publish
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SectionSelectorModal;