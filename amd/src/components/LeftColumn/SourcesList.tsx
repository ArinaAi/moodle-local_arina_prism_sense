import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    Tooltip,
} from '@mui/material';
import { Description, ExpandMore } from '@mui/icons-material';
import { FileText } from 'lucide-react';
import { formatFileSize } from '../../utils/helpers';
import { accordionStyles } from '../../styles/accordionStyles';
import type { SourceFile } from '../../types/app';

interface SourcesListProps {
    sources: SourceFile[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {

    // Helper to get all source IDs
    const getInitialExpanded = (srcs: SourceFile[]) => {
        const ids = new Set<number>();
        srcs.forEach(s => ids.add(s.sectionid));
        return ids;
    };

    const [expandedSections, setExpandedSections] = useState<Set<number>>(() => getInitialExpanded(sources));

    // Update expanded sections if sources change significantly (optional, but good for refresh)
    useEffect(() => {
        setExpandedSections(getInitialExpanded(sources));
    }, [sources]);

    const groupedSources = sources.reduce((acc, source) => {
        if (!acc[source.sectionid]) {
            acc[source.sectionid] = {
                sectionName: source.sectionname,
                files: []
            };
        }
        acc[source.sectionid].files.push(source);
        return acc;
    }, {} as Record<number, { sectionName: string; files: SourceFile[] }>);


    return (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
                Uploaded Sources ({sources.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Object.entries(groupedSources).map(([sectionId, { sectionName, files }]) => (
                    <Accordion
                        key={sectionId}
                        expanded={expandedSections.has(Number(sectionId))}
                        onChange={() => {
                            setExpandedSections((prev) => {
                                const newSet = new Set(prev);
                                const id = Number(sectionId);
                                if (newSet.has(id)) {
                                    newSet.delete(id);
                                } else {
                                    newSet.add(id);
                                }
                                return newSet;
                            });
                        }}
                        sx={accordionStyles.root}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore />}
                            disableRipple
                            sx={accordionStyles.summary}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <FileText size={18} color="#2563eb" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                <Tooltip
                                    title={sectionName}
                                    PopperProps={{ sx: { zIndex: 100006 } }}
                                    arrow
                                    placement="top"
                                    enterDelay={300}
                                    enterTouchDelay={500}
                                    leaveTouchDelay={1500}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: 'text.primary',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {sectionName}
                                    </Typography>
                                </Tooltip>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 2 }}>
                            <List sx={{ p: 0 }}>
                                {files.map((file, index) => (
                                    <ListItem
                                        key={file.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'clamp(6px, 1vw, 10px)',
                                            p: 'clamp(6px, 1.25vw, 10px)',
                                            mb: index < files.length - 1 ? 'clamp(4px, 0.8vw, 8px)' : 0,
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'all 0.2s ease',
                                            minWidth: 0,
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                transform: 'translateX(2px)',
                                            },
                                        }}
                                    >
                                        <Description sx={{ fontSize: 'clamp(16px, 2.2vw, 20px)', color: '#64748b', flexShrink: 0 }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: 'clamp(0.7rem, 1.5vw + 0.3rem, 0.85rem)',
                                                    lineHeight: 1.2,
                                                }}
                                            >
                                                {file.filename}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 'clamp(0.6rem, 1.2vw + 0.2rem, 0.75rem)' }}>
                                                {formatFileSize(file.filesize)}
                                            </Typography>
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Box>
    );
};

export default SourcesList;
