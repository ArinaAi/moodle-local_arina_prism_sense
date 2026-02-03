// components/Modals/FeedbackComponents/TopicPillSelector.tsx
import React from 'react';
import { Box, Chip, Typography, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

interface TopicPillSelectorProps {
  topics: string[];
  selectedTopics: string[];
  onSelectionChange: (selected: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
}

/**
 * Multi-select pill component for selecting topics from TOC
 */
const TopicPillSelector: React.FC<TopicPillSelectorProps> = ({
  topics,
  selectedTopics,
  onSelectionChange,
  loading = false,
  emptyMessage = 'No topics available',
  maxHeight = '180px',
}) => {
  const handleToggle = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onSelectionChange(selectedTopics.filter((t) => t !== topic));
    } else {
      onSelectionChange([...selectedTopics, topic]);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (topics.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', py: 2 }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        maxHeight,
        overflowY: 'auto',
        py: 1,
        pr: 0.5,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f5f9',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#cbd5e1',
          borderRadius: '3px',
          '&:hover': {
            background: '#94a3b8',
          },
        },
      }}
    >
      {topics.map((topic) => {
        const isSelected = selectedTopics.includes(topic);
        return (
          <Chip
            key={topic}
            label={topic}
            onClick={() => handleToggle(topic)}
            icon={isSelected ? <CheckIcon sx={{ fontSize: 16 }} /> : undefined}
            sx={{
              height: 'auto',
              py: 0.75,
              px: 0.5,
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: isSelected ? 600 : 500,
              backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
              border: '1px solid',
              borderColor: isSelected ? '#3b82f6' : 'transparent',
              color: isSelected ? '#1d4ed8' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '& .MuiChip-label': {
                px: 1,
                whiteSpace: 'normal',
                lineHeight: 1.3,
              },
              '& .MuiChip-icon': {
                color: '#1d4ed8',
                ml: 0.5,
              },
              '&:hover': {
                backgroundColor: isSelected ? '#bfdbfe' : '#e2e8f0',
                borderColor: isSelected ? '#2563eb' : '#cbd5e1',
              },
              '&:focus': {
                boxShadow: 'none !important',
              },
            }}
          />
        );
      })}
    </Box>
  );
};

export default TopicPillSelector;
