import React from 'react';
import { Box, Skeleton } from '@mui/material';

const SourceLoadingState: React.FC = () => {
    return (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Skeleton variant="text" width={140} height={24} sx={{ mb: 2 }} animation="wave" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[1, 2, 3].map((item) => (
                    <Box
                        key={item}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.4)',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            opacity: 1 - (item * 0.15)
                        }}
                    >
                        <Skeleton variant="circular" width={24} height={24} animation="wave" />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={20} animation="wave" />
                            <Skeleton variant="text" width="40%" height={16} animation="wave" />
                        </Box>
                        <Skeleton variant="circular" width={18} height={18} animation="wave" />
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default SourceLoadingState;
