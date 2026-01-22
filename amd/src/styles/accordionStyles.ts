
import { SxProps, Theme } from '@mui/material/styles';

export const accordionStyles = {
    root: {
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
    } as SxProps<Theme>,
    summary: {
        minHeight: '48px',
        boxShadow: 'none !important',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
        '& .MuiAccordionSummary-content': {
            margin: '8px 0',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minWidth: 0,
            overflow: 'hidden',
            width: '100%',
        },
    } as SxProps<Theme>,
};
