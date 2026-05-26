// components/docks/ContentTypeDock.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Presentation, Play, SquarePen, BookOpen } from 'lucide-react';
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
  hasCredits?: boolean;
  creditTooltip?: string;
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
    label: 'Blackboard',
    icon: SquarePen,
    color: '#6f42c1',
    description: 'Real-time Blackboards that simplify, visualize, and accelerate understanding.'
  },
  {
    id: 'practice',
    label: 'Practice Exercise',
    icon: BookOpen,
    color: '#e83e8c',
    description: 'Generate practice problems and exercises to reinforce learning'
  },
];

// Threshold for switching to icon-only mode (in pixels)
const COMPACT_THRESHOLD = 200;

const ContentTypeDock: React.FC<ContentTypeDockProps> = ({
  activeType,
  onSelectType,
  onOpenCurriculumModal,
  onOpenVideoModal,
  isGeneratingSlides,
  hasSlides,
  hasSources,
  isMobile: _isMobile = false,
  hasCredits = true,
  creditTooltip = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  // Use ResizeObserver to detect container width and toggle compact mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) { return; }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIsCompact(width < COMPACT_THRESHOLD);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isDisabled = useCallback((typeId: string) => {
    // Disable all options when no credits
    if (!hasCredits) {
      return true;
    }
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
  }, [isGeneratingSlides, hasSources, hasCredits]);

  const getTooltipTitle = useCallback((typeId: string) => {
    // Show credit tooltip when no credits available
    if (!hasCredits) {
      return creditTooltip;
    }
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
  }, [hasSources, isGeneratingSlides, hasSlides, hasCredits, creditTooltip]);

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
    <Box
      id="arina_prism_sense-tour-content-dock"
      ref={containerRef}
      sx={{
        width: '100%',
        overflow: 'visible', // Allow borders/shadows to show
        // Enable container queries for child elements
        containerType: 'inline-size',
        containerName: 'content-dock',
        p: 'clamp(4px, 0.8vw, 6px)',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          // Use 3 columns when compact (icon-only), 2 columns otherwise
          gridTemplateColumns: isCompact ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: isCompact ? '3px' : 'clamp(4px, 0.8vw, 6px)',
          width: '100%',
          // Add padding to prevent border/shadow clipping on all sides
          p: 'clamp(2px, 0.5vw, 4px)',
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
            isCompact={isCompact}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ContentTypeDock;
