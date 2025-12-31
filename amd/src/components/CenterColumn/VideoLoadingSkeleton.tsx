import React from 'react';
import { Box, Skeleton} from '@mui/material';

const VideoLoadingSkeleton: React.FC = () => {
    return (
        <Box sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Main video area */}
            <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 2 }} />

            {/* Title and details */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" height={24} />
            </Box>

            {/* Controls placeholder */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
            </Box>
        </Box>
    );
};

export default VideoLoadingSkeleton;
