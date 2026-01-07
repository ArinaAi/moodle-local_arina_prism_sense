import React, { useState } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    MenuItem,
    Select,
    FormControl,
    CircularProgress,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ContentItem, Section } from '../../mockData';
import { useContent } from '../../context/ContentContext';
import { accordionStyles } from '../../../styles/accordionStyles';

const ContentNavigator: React.FC = () => {
    const { selectedContent, setSelectedContent, sections, isLoading, error } = useContent();
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1]));
    const [sectionFilter, setSectionFilter] = useState<number | 'all'>('all');

    if (isLoading) {
        return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} sx={{ color: '#94a3b8' }} /></Box>;
    }

    if (error) {
        return <Typography color="error" sx={{ p: 3, fontSize: '0.9rem' }}>{error}</Typography>;
    }

    if (!sections || sections.length === 0) {
        return <Typography sx={{ p: 3, color: 'text.secondary', fontSize: '0.9rem' }}>No content available.</Typography>;
    }

    const toggleSection = (sectionId: number) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const handleItemClick = (item: ContentItem) => {
        setSelectedContent(item);
    };

    // Filter out sections with no content
    const visibleSections = sections.filter(section => section.items && section.items.length > 0);

    // Filter sections based on selected filter
    const filteredSections = sectionFilter === 'all'
        ? visibleSections
        : visibleSections.filter(section => section.id === sectionFilter);

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f8fafc', // Main sidebar background
            borderRight: '1px solid rgba(0,0,0,0.04)'
        }}>
            {/* Header Area */}
            <Box sx={{ p: 2.5, pb: 1.5 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', letterSpacing: '-0.01em' }}>
                    Course Content
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {sections.reduce((acc, section) => acc + section.items.length, 0)} items total
                </Typography>
            </Box>

            {/* Filter */}
            <Box sx={{ px: 2.5, mb: 2.5 }}>
                <FormControl fullWidth size="small">
                    <Select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value as number | 'all')}
                        displayEmpty
                        startAdornment={
                            <FilterListIcon sx={{ mr: 1, fontSize: 18, color: '#64748b' }} />
                        }
                        MenuProps={{
                            disablePortal: false, // Ensure it breaks out of any overflow:hidden containers
                            PaperProps: {
                                sx: {
                                    mt: 1,
                                    zIndex: 99999, // Explicit high z-index
                                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.04)',
                                }
                            },
                            // Target the root popover/modal to ensure z-index applies
                            sx: {
                                zIndex: 99999
                            }
                        }}
                        sx={{
                            borderRadius: '12px',
                            bgcolor: '#ffffff',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#334155',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            '& fieldset': { border: '1px solid rgba(0,0,0,0.06)' },
                            '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.1) !important' },
                            '&.Mui-focused fieldset': { borderColor: '#2563eb !important', borderWidth: '1px !important' },
                        }}
                    >
                        <MenuItem value="all">All Sections</MenuItem>
                        {visibleSections.map(section => (
                            <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Scrollable Content Range */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                px: 2,
                pb: 2,
                '::-webkit-scrollbar': { width: '4px' },
                '::-webkit-scrollbar-thumb': { borderRadius: '4px', bgcolor: 'rgba(0,0,0,0.1)' }
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {filteredSections.map((section) => (
                        <SectionAccordion
                            key={section.id}
                            section={section}
                            isExpanded={expandedSections.has(section.id)}
                            onToggle={toggleSection}
                            selectedContent={selectedContent}
                            onItemClick={handleItemClick}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

// Helper function moved outside (reduces complexity)
const getContentIcon = (item: ContentItem, isSelected: boolean) => {
    let color;
    if (isSelected) {
        color = '#2563eb';
    } else if (item.type === 'video') {
        color = '#0ea5e9';
    } else {
        color = '#f59e0b';
    }

    if (item.isCompleted) { return <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e' }} />; }
    if (item.type === 'video') { return <PlayCircleOutlineIcon sx={{ fontSize: 18, color }} />; }
    return <DescriptionIcon sx={{ fontSize: 18, color }} />;
};

// Extracted Component to reduce complexity of ContentNavigator
interface SectionAccordionProps {
    section: Section; // Ideally typed from sections prop
    isExpanded: boolean;
    onToggle: (id: number) => void;
    selectedContent: ContentItem | null;
    onItemClick: (item: ContentItem) => void;
}

const SectionAccordion: React.FC<SectionAccordionProps> = ({
    section,
    isExpanded,
    onToggle,
    selectedContent,
    onItemClick
}) => {
    const completedCount = section.items.filter((i: ContentItem) => i.isCompleted).length;
    const progress = (completedCount / section.items.length) * 100;

    return (
        <Accordion
            expanded={isExpanded}
            onChange={() => onToggle(section.id)}
            sx={accordionStyles.root}
        >
            <AccordionSummary
                expandIcon={<ExpandMore sx={{ fontSize: 20, color: '#94a3b8' }} />}
                sx={accordionStyles.summary}
            >
                <Box sx={{ width: '100%', pr: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                            {section.title}
                        </Typography>
                    </Box>

                    {/* Progress Bar within Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ flex: 1, bgcolor: '#e2e8f0', borderRadius: '4px', height: 4, overflow: 'hidden' }}>
                            <Box sx={{
                                width: `${progress}%`,
                                height: '100%',
                                bgcolor: progress === 100 ? '#22c55e' : '#3b82f6',
                                transition: 'width 0.5s ease'
                            }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 500, minWidth: 35 }}>
                            {completedCount}/{section.items.length}
                        </Typography>
                    </Box>
                </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0, pb: 1, px: 1 }}>
                <List sx={{ p: 0 }}>
                    {section.items.map((item: ContentItem, index: number) => {
                        const isSelected = selectedContent?.id === item.id;
                        return (
                            <ListItem
                                key={item.id}
                                onClick={() => onItemClick(item)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    mb: index < section.items.length - 1 ? 1 : 0, // Margin between cards
                                    borderRadius: '8px',
                                    cursor: 'pointer',

                                    // Card Styling
                                    bgcolor: isSelected ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                                    border: '1px solid',
                                    borderColor: isSelected ? '#2563eb' : 'rgba(0,0,0,0.12)',
                                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',

                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        bgcolor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'rgba(0,0,0,0.02)',
                                        transform: 'translateX(4px)',
                                        borderColor: isSelected ? '#2563eb' : 'rgba(0,0,0,0.3)',
                                    },

                                    ...(isSelected && {
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0, top: 0, bottom: 0,
                                            width: '4px',
                                            bgcolor: '#2563eb',
                                        }
                                    })
                                }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32, height: 32,
                                    borderRadius: '50%',
                                    bgcolor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(241, 245, 249, 0.5)',
                                    flexShrink: 0,
                                    color: isSelected ? '#2563eb' : '#64748b'
                                }}>
                                    {getContentIcon(item, isSelected)}
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            fontWeight: isSelected ? 600 : 500,
                                            color: isSelected ? '#1e293b' : '#334155',
                                            fontSize: '0.875rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            lineHeight: 1.4,
                                            mb: 0.25
                                        }}
                                    >
                                        {item.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {item.duration}
                                        </Typography>
                                        {item.totalSlides && (
                                            <>
                                                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>•</Typography>
                                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                                                    {item.totalSlides} slides
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </ListItem>
                        );
                    })}
                </List>
            </AccordionDetails>
        </Accordion>
    );
};

export default ContentNavigator;
