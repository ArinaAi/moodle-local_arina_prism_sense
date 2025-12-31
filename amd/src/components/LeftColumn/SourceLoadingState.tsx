import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const SourceLoadingState: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
        </Box>
    );
};

export default SourceLoadingState;
