import React from 'react';
import {
    Box,
    Typography,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { FolderOpen } from 'lucide-react';
import type { ContentItem } from '../../../types/app';
import SlideDeckItem from './SlideDeckItem';

interface SectionGroupProps {
    sectionId: number;
    sectionName: string;
    slides: ContentItem[];
    selectedSlideId: number | null;
    onSelect: (id: number) => void;
}

const SectionGroup: React.FC<SectionGroupProps> = ({
    sectionId,
    sectionName,
    slides,
    selectedSlideId,
    onSelect,
}) => {
    return (
        <Accordion
            disableGutters
            sx={{
                mb: 1,
                border: '2px solid #e9ecef',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                overflow: 'hidden',
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                    bgcolor: 'rgba(15, 108, 191, 0.02)',
                    '&:hover': { bgcolor: 'rgba(15, 108, 191, 0.05)' },
                    '&.Mui-expanded': { minHeight: 48, bgcolor: 'rgba(15, 108, 191, 0.02)' },
                    '&.Mui-focusVisible': { bgcolor: 'rgba(15, 108, 191, 0.02)' },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <FolderOpen size={20} color="#0f6cbf" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                        {sectionName}
                    </Typography>
                    <Chip
                        label={`${slides.length} deck${slides.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(13, 92, 162, 0.1)',
                            color: '#0D5CA2',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                        }}
                    />
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, bgcolor: '#fafafa' }}>
                {slides.map((slide) => (
                    <SlideDeckItem
                        key={slide.id}
                        slide={slide}
                        isSelected={selectedSlideId === slide.id}
                        sectionName={sectionName}
                        onSelect={onSelect}
                    />
                ))}
            </AccordionDetails>
        </Accordion>
    );
};

export default SectionGroup;
