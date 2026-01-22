// components/docks/ContentTypeDock.tsx
import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { Presentation, Play, Wallet, Network, BookOpen, Briefcase } from 'lucide-react';
import ContentTypeButton, { ContentTypeDefinition } from './ContentTypeButton';

interface ContentTypeDockProps {
  activeType: string;
  onSelectType: (type: string) => void;
  onOpenCurriculumModal: () => void;
  onOpenVideoModal: () => void;
  isGeneratingSlides: boolean;
  hasSlides: boolean;
  hasSources: boolean;
  isMobile?: boolean;
}

const contentTypes: ContentTypeDefinition[] = [
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

const ContentTypeDock: React.FC<ContentTypeDockProps> = ({
  activeType,
  onSelectType,
  onOpenCurriculumModal,
  onOpenVideoModal,
  isGeneratingSlides,
  hasSlides,
  hasSources,
  isMobile = false,
}) => {

  const isDisabled = useCallback((typeId: string) => {
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
  }, [isGeneratingSlides, hasSources]);

  const getTooltipTitle = useCallback((typeId: string) => {
    const type = contentTypes.find(t => t.id === typeId);
    if (typeId === 'slide-deck') {
      if (!hasSources) {
        return 'Add sources to generate slides';
      }
      if (isGeneratingSlides) {
        return 'Generating slides...';
      }
    } else if (!hasSlides && typeId !== 'slide-deck') {
      // Show helpful message even though button is enabled
      return `${type?.description || ''} (Only available for chapters/sections with slides)`;
    }
    // Return description for all content types
    return type?.description || '';
  }, [hasSources, isGeneratingSlides, hasSlides]);

  const handleTypeClick = (typeId: string) => {
    if (typeId === 'slide-deck') {
      // Always switch to slide-deck view
      onSelectType(typeId);
      // Always open the modal to ensure accessibility
      onOpenCurriculumModal();
    } else if (typeId === 'video') {
      onSelectType(typeId);
      onOpenVideoModal();
    } else {
      onSelectType(typeId);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'grid',
          // Mobile: 1 column for better touch targets and readability
          // Tablet/Desktop: 2 columns
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 'clamp(12px, 1.5vh, 16px)',
        }}
      >
        {contentTypes.map((type) => (
          <ContentTypeButton
            key={type.id}
            type={type}
            activeType={activeType}
            disabled={isDisabled(type.id)}
            tooltipTitle={getTooltipTitle(type.id)}
            onClick={handleTypeClick}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ContentTypeDock;
