import React, { useState } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    List,
    ListItem,
    MenuItem,
    Select,
    FormControl,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { FileText } from 'lucide-react';
import { mockSections, ContentItem } from '../../mockData';
import { useContent } from '../../context/ContentContext';

const ContentNavigator: React.FC = () => {
    const { selectedContent, setSelectedContent } = useContent();
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1])); // First section expanded by default
    const [sectionFilter, setSectionFilter] = useState<number | 'all'>('all');

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

    const getContentIcon = (item: ContentItem) => {
        if (item.isCompleted) { return <CheckCircleIcon sx={{ fontSize: 20, color: '#22c55e' }} />; }
        if (item.type === 'video') { return <PlayCircleOutlineIcon sx={{ fontSize: 20, color: '#2563eb' }} />; }
        return <DescriptionIcon sx={{ fontSize: 20, color: '#2563eb' }} />;
    };

    // Filter sections based on selected filter
    const filteredSections = sectionFilter === 'all'
        ? mockSections
        : mockSections.filter(section => section.id === sectionFilter);

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, fontSize: '1.25rem', color: 'text.primary' }}>
                Course Content
            </Typography>

            {/* Divider */}
            <Box sx={{ height: '1px', bgcolor: 'divider', mb: 2 }} />

            {/* Section Filter */}
            <FormControl fullWidth sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
                <Select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value as number | 'all')}
                    displayEmpty
                    size="small"
                    startAdornment={
                        <FilterListIcon sx={{ mr: 1, fontSize: 18, color: '#2563eb' }} />
                    }
                    MenuProps={{
                        disablePortal: false,
                        PaperProps: {
                            sx: {
                                zIndex: 99999,
                                maxHeight: 300,
                                mt: 0.5,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                            }
                        },
                        anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                        },
                        transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                        },
                        slotProps: {
                            root: {
                                sx: {
                                    zIndex: 99999
                                }
                            }
                        }
                    }}
                    sx={{
                        borderRadius: '8px',
                        bgcolor: 'rgba(37, 99, 235, 0.04)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        boxShadow: 'none !important',
                        '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none',
                        },
                        '&:hover': {
                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                            borderColor: 'rgba(37, 99, 235, 0.4)',
                        },
                        '&.Mui-focused': {
                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                            borderColor: '#2563eb',
                        },
                        '& .MuiSelect-select': {
                            py: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                        },
                    }}
                >
                    <MenuItem value="all">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            All Sections
                        </Typography>
                    </MenuItem>
                    {mockSections.map(section => (
                        <MenuItem key={section.id} value={section.id}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {section.title}
                            </Typography>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Section Accordions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {filteredSections.map((section) => {
                    const isExpanded = expandedSections.has(section.id);
                    const completedCount = section.items.filter(i => i.isCompleted).length;

                    return (
                        <Accordion
                            key={section.id}
                            expanded={isExpanded}
                            onChange={() => toggleSection(section.id)}
                            sx={{
                                border: '1px solid rgba(37, 99, 235, 0.3)',
                                borderRadius: '12px !important',
                                backgroundColor: '#ffffff',
                                '&:before': { display: 'none' },
                                boxShadow: 'none !important',
                                transition: 'all 0.3s ease',
                                WebkitTapHighlightColor: 'transparent',
                                '&:hover': {
                                    boxShadow: '0 2px 8px rgba(13, 92, 162, 0.15)',
                                },
                                '&.Mui-expanded': {
                                    margin: 0,
                                    marginBottom: '12px',
                                },
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMore />}
                                disableRipple
                                sx={{
                                    minHeight: '48px',
                                    boxShadow: 'none !important',
                                    WebkitTapHighlightColor: 'transparent',
                                    '& .MuiAccordionSummary-content': {
                                        margin: '8px 0',
                                        alignItems: 'center',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                                    <FileText size={18} color="#2563eb" strokeWidth={2.5} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.primary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {section.title}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                            {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${completedCount}/${section.items.length}`}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                                            color: '#2563eb',
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>
                            </AccordionSummary>

                            <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
                                <List sx={{ p: 0 }}>
                                    {section.items.map((item) => {
                                        const isSelected = selectedContent?.id === item.id;

                                        return (
                                            <ListItem
                                                key={item.id}
                                                onClick={() => handleItemClick(item)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                    p: 1.5,
                                                    mb: 0.5,
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    bgcolor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                                    color: isSelected ? '#1e293b' : 'text.primary',
                                                    border: '1px solid',
                                                    borderColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                                                        transform: 'translateX(4px)',
                                                    },
                                                    ...(isSelected && {
                                                        '::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            left: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: '3px',
                                                            bgcolor: '#2563eb',
                                                            borderRadius: '3px 0 0 3px'
                                                        }
                                                    })
                                                }}
                                            >
                                                {getContentIcon(item)}

                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                fontSize: '0.85rem',
                                                                flex: 1
                                                            }}
                                                        >
                                                            {item.title}
                                                        </Typography>
                                                        {item.isCompleted && (
                                                            <Chip
                                                                label="Complete"
                                                                size="small"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: '#dcfce7',
                                                                    color: '#16a34a',
                                                                    fontWeight: 500
                                                                }}
                                                            />
                                                        )}
                                                    </Box>

                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                                                        {item.type === 'video' ? 'Video Lecture' : 'Slide Deck'} • {item.duration}
                                                    </Typography>

                                                    {item.totalSlides && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                                                            {item.totalSlides} slides
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>
        </Box>
    );
};

export default ContentNavigator;
