// components/Modals/FeedbackComponents/ChipInput.tsx
import React, { useState, KeyboardEvent } from 'react';
import { Box, Chip, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

interface ChipInputProps {
  chips: string[];
  onChipsChange: (chips: string[]) => void;
  placeholder?: string;
  label?: string;
  maxChips?: number;
}

/**
 * Input component that creates chips/tags from user input
 * User types text and presses Enter to add as a chip
 */
const ChipInput: React.FC<ChipInputProps> = ({
  chips,
  onChipsChange,
  placeholder = 'Type and press Enter to add...',
  label,
  maxChips = 20,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newChip = inputValue.trim();

      // Don't add duplicates
      if (!chips.includes(newChip) && chips.length < maxChips) {
        onChipsChange([...chips, newChip]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      // Remove last chip on backspace when input is empty
      onChipsChange(chips.slice(0, -1));
    }
  };

  const handleRemoveChip = (chipToRemove: string) => {
    onChipsChange(chips.filter((chip) => chip !== chipToRemove));
  };

  return (
    <Box>
      {label && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 600,
            color: '#64748b',
            fontSize: '0.7rem',
          }}
        >
          {label}
        </Typography>
      )}
      
      {/* Chips Display Area - Above Input */}
      {chips.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            p: 1.5,
            mb: 1,
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          {chips.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              onDelete={() => handleRemoveChip(chip)}
              deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{
                height: 28,
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #7dd3fc',
                '& .MuiChip-deleteIcon': {
                  color: '#0284c7',
                  '&:hover': {
                    color: '#0369a1',
                  },
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Text Input Area - Below Chips */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          mt: '7px',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          transition: 'all 0.2s',
          '&:focus-within': {
            backgroundColor: '#ffffff',
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
          },
        }}
      >
        <AddIcon sx={{ fontSize: 16, color: '#94a3b8', flexShrink: 0 }} />
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          variant="standard"
          fullWidth
          disabled={chips.length >= maxChips}
          InputProps={{
            disableUnderline: true,
            sx: {
              fontSize: '0.85rem',
              '& input': {
                padding: 0,
                '&::placeholder': {
                  color: '#94a3b8',
                  opacity: 1,
                },
              },
            },
          }}
        />
      </Box>
      {chips.length >= maxChips && (
        <Typography variant="caption" sx={{ color: '#f59e0b', mt: 0.5, display: 'block' }}>
          Maximum {maxChips} items reached
        </Typography>
      )}
    </Box>
  );
};

export default ChipInput;
