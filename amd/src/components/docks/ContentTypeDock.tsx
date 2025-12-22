// components/docks/ContentTypeDock.tsx
import React from 'react';
import { Box, Button, Typography, Tooltip } from '@mui/material';
import { Presentation, Play, Wallet, Network, BookOpen, Briefcase } from 'lucide-react';

interface ContentTypeDockProps {
  activeType: string;
  onSelectType: (type: string) => void;
  onOpenCurriculumModal: () => void;
  isGeneratingSlides: boolean;
  hasSlides: boolean;
  hasSources: boolean;
  isMobile?: boolean;
}

const contentTypes = [
  {
    id: 'slide-deck',
    label: 'Slide Deck',
    icon: Presentation,
    color: '#0f6cbf',
    description: 'Create interactive presentation slides from your course materials'
  },
  {
    id: 'video',
    label: 'Video Lecture',
    icon: Play,
    color: '#28a745',
    description: 'Generate engaging video lecture scripts with visual cues'
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Wallet,
    color: '#6f42c1',
    description: 'Create study flashcards with questions and answers for quick review'
  },
  {
    id: 'mind-map',
    label: 'Mind Map',
    icon: Network,
    color: '#fd7e14',
    description: 'Visualize concepts and their relationships in an organized structure'
  },
  {
    id: 'practice',
    label: 'Practice Exercise',
    icon: BookOpen,
    color: '#e83e8c',
    description: 'Generate practice problems and exercises to reinforce learning'
  },
  {
    id: 'case-study',
    label: 'Case Study',
    icon: Briefcase,
    color: '#20c997',
    description: 'Create real-world scenarios and case studies for applied learning'
  },
];

const getHoverStyles = (disabled: boolean, isActive: boolean, color: string) => {
  if (disabled) {
    return {
      backgroundColor: '#ffffff',
      border: '1px solid transparent',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none',
    };
  }

  return {
    backgroundColor: isActive ? `${color}20` : `${color}10`,
    border: `1px solid ${color}`,
    cursor: 'pointer',
    transform: isActive ? 'scale(1.03)' : 'translateX(4px)',
    boxShadow: isActive ? `0 6px 16px ${color}30` : 'none',
  };
};

const ContentTypeDock: React.FC<ContentTypeDockProps> = ({
  activeType,
  onSelectType,
  onOpenCurriculumModal,
  isGeneratingSlides,
  hasSlides,
  hasSources,
  isMobile = false,
}) => {

  const isDisabled = (typeId: string) => {
    // Disable all options during generation
    if (isGeneratingSlides) {
      return true;
    }
    // Only slide-deck requires sources to be enabled
    if (typeId === 'slide-deck') {
      return !hasSources;
    }
    // All other content types are enabled by default
    return false;
  };

  const getTooltipTitle = (typeId: string) => {
    const type = contentTypes.find(t => t.id === typeId);
    if (typeId === 'slide-deck') {
      if (!hasSources) {
        return 'Add sources to generate slides';
      }
      if (isGeneratingSlides) {
        return 'Generating slides...';
      }
    } else if (!hasSlides) {
      // Show helpful message even though button is enabled
      return `${type?.description || ''} (Only available for chapters/sections with slides)`;
    }
    // Return description for all content types
    return type?.description || '';
  };

  const handleTypeClick = (typeId: string, disabled: boolean) => {
    console.log('🔘 ContentTypeDock: Clicked', typeId);
    if (disabled) {
      console.log('🚫 ContentTypeDock: Button disabled');
      return;
    }
    if (typeId === 'slide-deck') {
      console.log('📂 ContentTypeDock: Opening Slide Deck Modal');
      // Always switch to slide-deck view
      onSelectType(typeId);
      // Always open the modal to ensure accessibility
      onOpenCurriculumModal();
    } else {
      console.log('➡️ ContentTypeDock: Switching to', typeId);
      onSelectType(typeId);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 2,
        }}
      >
        {contentTypes.map((type) => {
          const Icon = type.icon;
          const disabled = isDisabled(type.id);
          const isActive = activeType === type.id;
          const tooltipTitle = getTooltipTitle(type.id);

          return (
            <Tooltip
              key={type.id}
              title={tooltipTitle}
              arrow
              placement="top"
              disableInteractive
              enterDelay={500}
              PopperProps={{
                sx: {
                  zIndex: 10006,
                },
              }}
            >
              <span>
                <Button
                  variant="text"
                  onClick={() => handleTypeClick(type.id, disabled)}
                  disabled={disabled}
                  size="medium"
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    border: isActive ? `1px solid ${type.color}` : '1px solid transparent',
                    backgroundColor: isActive ? `${type.color}15` : '#ffffff',
                    color: type.color,
                    borderRadius: '20px',
                    transition: 'all 0.3s ease',
                    '&:hover': getHoverStyles(disabled, isActive, type.color),
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    minHeight: '64px',
                    position: 'relative',
                    overflow: 'hidden',
                    px: 2,
                    py: 1.5,
                  }}
                  fullWidth
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      width: '100%',
                    }}
                  >
                    <Icon size={24} color={type.color} strokeWidth={isActive ? 3 : 2} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#000000',
                      }}
                    >
                      {type.label}
                    </Typography>
                  </Box>
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};

export default ContentTypeDock;