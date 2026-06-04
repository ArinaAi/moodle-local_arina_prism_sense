import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, CircularProgress, Chip,
    MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { GraduationCap, Plus, Edit2, Trash2, Clock, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

import * as api from '../api';
import type { Degree, DegreeMetadata } from '../types';

interface Props { onManageCurriculum: (degreeId: number) => void; }

const CYCLE_TYPES: { value: DegreeMetadata['cycle_type']; label: string }[] = [
    { value: 'semester', label: 'Semester (2/year)' },
    { value: 'trimester', label: 'Trimester (3/year)' },
    { value: 'quarterly', label: 'Quarterly (4/year)' },
    { value: 'annual', label: 'Annual (1/year)' },
];

const DEFAULT_META: DegreeMetadata = {
    cycle_type: 'semester',
    start_date: Math.floor(Date.now() / 1000),
    num_cycles: 6,
};

export const CatalogView: React.FC<Props> = ({ onManageCurriculum }) => {
    const [degrees, setDegrees] = useState<Degree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const [dialogName, setDialogName] = useState('');
    const [dialogMeta, setDialogMeta] = useState<DegreeMetadata>(DEFAULT_META);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [editingDegreeId, setEditingDegreeId] = useState<number | null>(null);

    // Delete state
    const [deleteConfirm, setDeleteConfirm] = useState<Degree | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // ── Data fetching ───────────────────────────────────────────────────────────
    const fetchDegrees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getCatalog();
            if (res.success && res.data) {
                setDegrees(res.data.degrees);
            } else {
                setError(res.message ?? 'Failed to load catalog.');
            }
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDegrees(); }, [fetchDegrees]);

    // ── Dialog helpers ──────────────────────────────────────────────────────────
    const openAdd = () => {
        setDialogMode('add');
        setEditingDegreeId(null);
        setDialogName('');
        setDialogMeta(DEFAULT_META);
        setSaveError(null);
        setDialogOpen(true);
    };

    const openEdit = (deg: Degree) => {
        setDialogMode('edit');
        setEditingDegreeId(deg.id);
        setDialogName(deg.name);
        setDialogMeta(deg.metadata ?? DEFAULT_META);
        setSaveError(null);
        setDialogOpen(true);
    };

    // ── Save ────────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!dialogName.trim()) { setSaveError('Degree name is required.'); return; }
        setSaving(true);
        setSaveError(null);
        try {
            if (dialogMode === 'add') {
                await api.createDegree(dialogName.trim(), dialogMeta);
            } else if (editingDegreeId !== null) {
                // Update both name and metadata independently.
                await api.updateDegree(editingDegreeId, dialogName.trim());
                await api.updateDegreeMeta(editingDegreeId, dialogMeta);
            }
            setDialogOpen(false);
            await fetchDegrees();
        } catch (e: unknown) {
            setSaveError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteConfirm) { return; }
        setDeleteError(null);
        try {
            await api.deleteDegree(deleteConfirm.id);
            setDeleteConfirm(null);
            await fetchDegrees();
        } catch (e: unknown) {
            setDeleteError((e as Error).message);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* ── Page Header ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        background: 'linear-gradient(135deg, #0f6cbf 0%, #084C86 100%)',
                        borderRadius: '12px', p: 1.25,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(15,108,191,0.3)',
                    }}>
                        <GraduationCap size={22} color="#fff" />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--tp)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                            Academic Catalog
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--ts)', mt: 0.25 }}>
                            Manage your degrees and cycles
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={openAdd}
                    sx={{ borderRadius: '10px', fontWeight: 700, px: 2.5, py: 1.25, textTransform: 'none', fontSize: '0.9rem' }}
                >
                    Add Degree
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Degrees List ── */}
            {degrees.length === 0 && !error ? (
                <Box sx={{ border: '2px dashed var(--border)', borderRadius: '16px', py: 10, textAlign: 'center', color: 'var(--td)' }}>
                    <GraduationCap size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <Typography variant="body1" sx={{ mb: 2 }}>No degrees yet. Add your first degree to get started.</Typography>
                    <Button variant="outlined" startIcon={<Plus size={15} />} onClick={openAdd}
                        sx={{ borderRadius: '10px', textTransform: 'none' }}>
                        Add Degree
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {degrees.map((deg, di) => (
                        <motion.div
                            key={deg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: di * 0.04 }}
                            style={{
                                background: 'var(--paper)',
                                border: '1px solid var(--border)',
                                borderRadius: 16,
                                boxShadow: 'var(--shadow)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* ── Degree card header ── */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 2.5, py: 2,
                                background: 'rgba(15,108,191,0.02)',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '10px',
                                        background: 'rgba(15,108,191,0.10)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <GraduationCap size={18} color="#0f6cbf" />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--tp)', lineHeight: 1.2 }}>
                                            {deg.name}
                                        </Typography>
                                        {deg.metadata && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--td)', letterSpacing: '0.05em' }}>
                                                    Cycle: {deg.metadata.cycle_type}
                                                </Typography>
                                                <Box sx={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Clock size={11} color="var(--td)" />
                                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--td)', letterSpacing: '0.05em' }}>
                                                        {deg.metadata.num_cycles} cycles
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={`${deg.semesters?.length ?? 0} ${deg.metadata?.cycle_type ?? 'semester'}${(deg.semesters?.length ?? 0) !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize', background: 'rgba(15,108,191,0.08)', color: '#0f6cbf', border: '1px solid rgba(15,108,191,0.2)', borderRadius: '6px', height: 24 }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Layers size={13} />}
                                        onClick={() => onManageCurriculum(deg.id)}
                                        sx={{ borderRadius: '8px', fontWeight: 600, textTransform: 'none', fontSize: '0.8rem', py: 0.5, px: 1.5, borderColor: 'var(--border)', color: 'var(--ts)', '&:hover': { borderColor: '#0f6cbf', color: '#0f6cbf', background: 'rgba(15,108,191,0.05)' } }}
                                    >
                                        Manage Curriculum
                                    </Button>
                                    <Tooltip title="Edit degree">
                                        <IconButton size="small" onClick={() => openEdit(deg)}
                                            sx={{ borderRadius: '8px', color: 'var(--ts)', '&:hover': { color: '#0f6cbf', background: 'rgba(15,108,191,0.08)' } }}>
                                            <Edit2 size={14} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete degree">
                                        <IconButton size="small" onClick={() => { setDeleteConfirm(deg); setDeleteError(null); }}
                                            sx={{ borderRadius: '8px', color: 'var(--td)', '&:hover': { color: '#e53935', background: 'rgba(229,57,53,0.08)' } }}>
                                            <Trash2 size={14} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>

                            {/* ── Degree card body: semester chips ── */}
                            <Box sx={{ px: 2.5, py: 1.75 }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--td)', mb: 1.25 }}>
                                    Semesters / Terms
                                </Typography>
                                {(deg.semesters?.length ?? 0) > 0 ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {deg.semesters!.map(sem => (
                                            <Chip
                                                key={sem.id}
                                                label={`${sem.name} · ${sem.subjects?.length ?? 0} subject${(sem.subjects?.length ?? 0) !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ts)', background: 'var(--rh)', border: '1px solid var(--border)', borderRadius: '6px', height: 26 }}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--td)', fontStyle: 'italic' }}>
                                        No semesters generated yet.
                                    </Typography>
                                )}
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            )}

            {/* ── Add / Edit Dialog ── */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}>
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    {dialogMode === 'add' ? 'Create New Degree' : 'Edit Degree'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    {saveError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{saveError}</Alert>}
                    <TextField
                        autoFocus label="Degree Name" value={dialogName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDialogName(e.target.value)}
                        fullWidth size="small" sx={{ mt: 1 }}
                    />
                    <FormControl size="small" fullWidth>
                        <InputLabel>Cycle Type</InputLabel>
                        <Select label="Cycle Type" value={dialogMeta.cycle_type}
                            onChange={e => setDialogMeta(m => ({ ...m, cycle_type: e.target.value as DegreeMetadata['cycle_type'] }))}>
                            {CYCLE_TYPES.map(ct => <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Start Date" type="date" size="small" fullWidth
                        value={(() => {
                            const d = new Date(dialogMeta.start_date * 1000);
                            const mm = d.getMonth() + 1;
                            const dd = d.getDate();
                            return `${d.getFullYear()}-${mm < 10 ? '0' + mm : mm}-${dd < 10 ? '0' + dd : dd}`;
                        })()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.value) {
                                const parts = e.target.value.split('-').map(Number);
                                const ts = Math.floor(new Date(parts[0], parts[1] - 1, parts[2]).getTime() / 1000);
                                if (!isNaN(ts)) { setDialogMeta(prev => ({ ...prev, start_date: ts })); }
                            }
                        }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Number of Cycles"
                        type="number" size="small" fullWidth
                        value={dialogMeta.num_cycles}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDialogMeta(m => ({ ...m, num_cycles: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                        inputProps={{ min: 1, max: 20 }}
                        helperText={dialogMode === 'edit' ? 'Empty cycles will be removed; cycles with subjects are preserved.' : 'Auto-generates term categories.'}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}
                        sx={{ textTransform: 'none', borderRadius: '10px', flex: 1 }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', flex: 1 }}>
                        {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                        {dialogMode === 'add' ? 'Create Degree' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirmation ── */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Degree?</DialogTitle>
                <DialogContent>
                    {deleteError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{deleteError}</Alert>}
                    <Typography>
                        Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
                        This will permanently remove all associated semesters and subject courses.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDeleteConfirm(null)} variant="outlined"
                        sx={{ textTransform: 'none', borderRadius: '10px', flex: 1 }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', flex: 1 }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
