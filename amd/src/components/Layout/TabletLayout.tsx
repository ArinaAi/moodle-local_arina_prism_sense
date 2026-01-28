import React, { useState } from 'react';
import { Box, Menu, MenuItem, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { Delete, InfoOutlined } from '@mui/icons-material';
import LeftColumn from '../LeftColumn/LeftColumn';
import CenterColumn from '../CenterColumn/CenterColumn';
import GeneratedContentList from '../RightColumn/GeneratedContentList';
import PublishedContentList from '../RightColumn/PublishedContentList';
import { useContentPreview } from '../../hooks/useContentPreview';
import type { LayoutProps } from '../../types/layout';

const TabletLayout: React.FC<LayoutProps> = ({
    state,
    dispatch,
    onOpenSourcesModal,
    onOpenCurriculumModal,
    onOpenVideoModal,
    onApproveSlides,
    onClosePreview,
    onOpenFeedbackModal,
    onPublishContent,
    onClearAllContent: _onClearAllContent,
    onDeleteContent,
    isLoadingContent,
    isSmallTablet = false,
}) => {
    // Handler for previewing content from the list
    const { handlePreviewContent } = useContentPreview({
        contentItems: state.contentItems
    });

    // Menu and dialog state for GeneratedContentList
    const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement | null; contentId: number | null }>({
        element: null,
        contentId: null,
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; contentId: number | null }>({
        open: false,
        contentId: null,
    });
    const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; contentId: number | null }>({
        open: false,
        contentId: null,
    });

    const detailsItem = detailsDialog.contentId
        ? state.contentItems.find(item => item.id === detailsDialog.contentId)
        : null;

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
        });
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, contentId: number) => {
        event.stopPropagation();
        setMenuAnchor({ element: event.currentTarget, contentId });
    };

    const handleMenuClose = () => {
        setMenuAnchor({ element: null, contentId: null });
    };

    const handleDeleteClick = () => {
        if (menuAnchor.contentId) {
            setDeleteConfirmation({ open: true, contentId: menuAnchor.contentId });
        }
        handleMenuClose();
    };

    const handleDetailsClick = () => {
        if (menuAnchor.contentId) {
            setDetailsDialog({ open: true, contentId: menuAnchor.contentId });
        }
        handleMenuClose();
    };

    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: isSmallTablet
                        ? 'minmax(200px, 1fr) minmax(260px, 1.3fr)'
                        : 'minmax(240px, 1fr) minmax(300px, 1.4fr)',
                    gridTemplateRows: '70% 30%',
                    gap: 'clamp(8px, 1.5vw, 14px)',
                    p: 'clamp(8px, 1.5vw, 14px)',
                    height: '100%',
                    maxHeight: '100%',
                    width: '100%',
                    minHeight: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                }}
            >
                {/* Top Left: Sources + Dock */}
                <Box sx={{ minHeight: 0, overflow: 'auto' }}>
                    <LeftColumn
                        state={state}
                        onOpenSourcesModal={onOpenSourcesModal}
                        onOpenCurriculumModal={onOpenCurriculumModal}
                        onOpenVideoModal={onOpenVideoModal}
                        dispatch={dispatch}
                        isMobile={isSmallTablet}
                    />
                </Box>

                {/* Top Right: Center Column (Preview) */}
                <Box sx={{ minHeight: 0, overflow: 'auto' }}>
                    <CenterColumn
                        state={state}
                        onApproveSlides={onApproveSlides}
                        onClosePreview={onClosePreview}
                        onOpenFeedbackModal={onOpenFeedbackModal}
                        onOpenSourcesModal={onOpenSourcesModal}
                        hasAnySources={state.sources.length > 0}
                        isMobile={isSmallTablet}
                    />
                </Box>

                {/* Bottom Left: Generated Content */}
                <Box sx={{ minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <GeneratedContentList
                        contentItems={state.contentItems}
                        isLoading={isLoadingContent ?? false}
                        onPublish={onPublishContent}
                        onMenuOpen={handleMenuOpen}
                        isMobile={isSmallTablet}
                        onPreviewContent={handlePreviewContent}
                    />
                </Box>

                {/* Bottom Right: Published Content */}
                <Box sx={{ minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <PublishedContentList
                        contentItems={state.contentItems}
                        isMobile={isSmallTablet}
                    />
                </Box>
            </Box>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor.element}
                open={Boolean(menuAnchor.element)}
                onClose={handleMenuClose}
                sx={{ zIndex: 100005 }}
                PaperProps={{ sx: { borderRadius: '12px', minWidth: '180px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } }}
            >
                <MenuItem onClick={handleDetailsClick} sx={{ gap: 1.5, py: 1.5, px: 2 }}>
                    <InfoOutlined fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>View Details</Typography>
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main', gap: 1.5, py: 1.5, px: 2 }}>
                    <Delete fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Delete</Typography>
                </MenuItem>
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmation.open}
                onClose={() => setDeleteConfirmation({ open: false, contentId: null })}
                PaperProps={{ sx: { borderRadius: '20px' } }}
            >
                <DialogTitle>Delete Content?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This action cannot be undone. The content will be permanently removed.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirmation({ open: false, contentId: null })}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (deleteConfirmation.contentId && onDeleteContent) {
                                onDeleteContent(deleteConfirmation.contentId);
                            }
                            setDeleteConfirmation({ open: false, contentId: null });
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Details Dialog */}
            <Dialog
                open={detailsDialog.open}
                onClose={() => setDetailsDialog({ open: false, contentId: null })}
                PaperProps={{ sx: { borderRadius: '20px', minWidth: '300px' } }}
            >
                <DialogTitle>Content Details</DialogTitle>
                <DialogContent>
                    {detailsItem && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box><Typography variant="caption" color="text.secondary">Title</Typography><Typography variant="body2">{detailsItem.title}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Section</Typography><Typography variant="body2">{detailsItem.sectionname}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Type</Typography><Typography variant="body2">{detailsItem.contenttype}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Status</Typography><Typography variant="body2">{detailsItem.status}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Created</Typography><Typography variant="body2">{formatDate(detailsItem.timecreated)}</Typography></Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDetailsDialog({ open: false, contentId: null })}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TabletLayout;
