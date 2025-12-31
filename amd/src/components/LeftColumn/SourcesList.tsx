import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
} from '@mui/material';
import { Description, ExpandMore } from '@mui/icons-material';
import { FileText } from 'lucide-react';
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

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) {
            return bytes + ' B';
        }
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        }
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

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
                        sx={{
                            border: `1px solid rgba(37, 99, 235, 0.3)`,
                            borderRadius: '12px !important',
                            backgroundColor: '#ffffffff',
                            '&:before': { display: 'none' },
                            boxShadow: 'none',
                            transition: 'all 0.3s ease',
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
                            sx={{
                                minHeight: '48px',
                                '& .MuiAccordionSummary-content': {
                                    margin: '8px 0',
                                    alignItems: 'center',
                                },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 1 }}>
                                <FileText size={18} color="#2563eb" strokeWidth={2.5} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {sectionName}
                                </Typography>
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
                                            gap: 1,
                                            p: 1.5,
                                            mb: index < files.length - 1 ? 1 : 0,
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                transform: 'translateX(4px)',
                                            },
                                        }}
                                    >
                                        <Description sx={{ fontSize: 20, color: '#64748b' }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {file.filename}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
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
