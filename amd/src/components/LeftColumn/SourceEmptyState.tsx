import React from 'react';
import { Box, Typography } from '@mui/material';
import { FileUp } from 'lucide-react';

const SourceEmptyState: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1,
            }}
        >
            <Box
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                }}
            >
                <FileUp size={28} color="#2563eb" strokeWidth={2} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                Upload PDFs by Section
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Click &quot;Manage Sources&quot; to upload 1-3 PDFs per section
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                Sources are organized by course sections
            </Typography>
        </Box>
    );
};

export default SourceEmptyState;
