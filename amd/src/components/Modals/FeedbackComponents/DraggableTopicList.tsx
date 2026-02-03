// components/Modals/FeedbackComponents/DraggableTopicList.tsx
import React, { useState, useCallback} from 'react';
import { Box, Typography, CircularProgress} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
interface DraggableTopicListProps {
  topics: string[];
  originalTopics: string[];
  onReorder: (reorderedTopics: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  orderChanged?: boolean;
  captionText?: string;
}

/**
 * Drag-and-drop reorderable list of topics
 * Uses native HTML5 drag and drop for lightweight implementation
 */
const DraggableTopicList: React.FC<DraggableTopicListProps> = ({
  topics,
  originalTopics,
  onReorder,
  loading = false,
  emptyMessage = 'No topics available',
  captionText,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image with some transparency
    const target = e.target as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, target.offsetWidth / 2, target.offsetHeight / 2);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newTopics = [...topics];
      const [draggedItem] = newTopics.splice(draggedIndex, 1);
      newTopics.splice(dropIndex, 0, draggedItem);

      onReorder(newTopics);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, topics, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

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
    <Box>
      {/* Caption header */}
      {captionText && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 500,
            color: '#64748b',
            fontSize: '0.75rem',
          }}
        >
          {captionText}
        </Typography>
      )}

      {/* Container for both lists */}
      <Box
        sx={{
          position: 'relative',
          maxHeight: '220px',
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
        {/* Reordered topics (current order) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          {topics.map((topic, index) => {
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const originalIndex = originalTopics.indexOf(topic);
            const hasMoved = originalIndex !== -1 && originalIndex !== index;

            return (
              <Box
                key={`reordered-${topic}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1.25,
                  backgroundColor: isDragging ? '#dbeafe' : isDragOver ? '#f0f9ff' : '#f8fafc',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: isDragging ? '#3b82f6' : isDragOver ? '#93c5fd' : '#e2e8f0',
                  cursor: 'grab',
                  opacity: isDragging ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  transform: isDragOver ? 'scale(1.01)' : 'none',
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                    borderColor: '#cbd5e1',
                  },
                  '&:active': {
                    cursor: 'grabbing',
                  },
                }}
              >
                <DragIndicatorIcon
                  sx={{
                    fontSize: 18,
                    color: '#94a3b8',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontWeight: 500,
                    color: '#334155',
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                  }}
                >
                  {topic}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  {hasMoved && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#94a3b8',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textDecoration: 'line-through',
                      }}
                    >
                      {originalIndex + 1}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: hasMoved ? '#22c55e' : '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>


      </Box>
    </Box>
  );
};

export default DraggableTopicList;
