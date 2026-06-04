import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button,
    IconButton, Alert, Tooltip, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, Table, CircularProgress,
    TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { Users, Plus, RefreshCw, UserCheck, Users2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import * as api from '../api';
import type { Catalog, Cohort, Subject, Degree, Semester } from '../types';

interface AssignDialogProps {
    open: boolean;
    subject: Subject | null;
    availableCohorts: Cohort[];
    onAssign: (cohortId: number) => Promise<void>;
    onUnassign: (cohortId: number) => Promise<void>;
    onClose: () => void;
    saving: boolean;
}

const AssignDialog: React.FC<AssignDialogProps> = ({
    open, subject, availableCohorts, onAssign, onUnassign, onClose, saving,
}) => {
    const [selectedCohort, setSelectedCohort] = useState<number | string>('');
    if (!subject) { return null; }

    const assignedIds = subject.cohorts.map(c => c.cohortid);
    const unassigned  = availableCohorts.filter(c => !assignedIds.includes(c.id));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>
                Assign Batches — &ldquo;{subject.fullname}&rdquo;
            </DialogTitle>
            <DialogContent>
                <Typography variant="caption" fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td)', mb: 1, display: 'block' }}>
                    Currently Assigned Batches
                </Typography>
                {subject.cohorts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mb: 2 }}>No batches assigned yet.</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                        {subject.cohorts.map(c => (
                            <Chip
                                key={c.cohortid}
                                label={c.cohortname}
                                icon={<UserCheck size={12} />}
                                color="info"
                                onDelete={() => onUnassign(c.cohortid)}
                                disabled={saving}
                                sx={{ fontWeight: 500 }}
                            />
                        ))}
                    </Box>
                )}

                <Typography variant="caption" fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--td)', mb: 1, display: 'block' }}>
                    Add a Batch
                </Typography>
                {unassigned.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">All available cohorts are already assigned.</Typography>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <Select value={selectedCohort} displayEmpty onChange={e => setSelectedCohort(e.target.value)}
                                sx={{ borderRadius: '10px' }}>
                                <MenuItem value=""><em>Choose…</em></MenuItem>
                                {unassigned.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained" size="small"
                            disabled={!selectedCohort || saving}
                            onClick={async () => {
                                if (!selectedCohort) { return; }
                                await onAssign(Number(selectedCohort));
                                setSelectedCohort('');
                            }}
                            startIcon={<Plus size={15} />}
                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                            Assign
                        </Button>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export const CohortView: React.FC = () => {
    const [catalog, setCatalog]         = useState<Catalog | null>(null);
    const [cohorts, setCohorts]         = useState<Cohort[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [saving, setSaving]           = useState(false);

    const [selectedDegreeId, setSelectedDegreeId] = useState<number | string>('');
    const [selectedSemId, setSelectedSemId]       = useState<number | string>('');
    const [assignDialog, setAssignDialog]         = useState<{ open: boolean; subject: Subject | null }>({ open: false, subject: null });

    const fetchAll = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [catRes, cohRes] = await Promise.all([api.getCatalog(), api.getCohorts()]);
            if (catRes.success && catRes.data) { setCatalog(catRes.data); }
            else { setError(catRes.message ?? 'Failed to load catalog.'); }
            if (cohRes.success && cohRes.data) { setCohorts(cohRes.data); }
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { setSelectedSemId(''); }, [selectedDegreeId]);

    const currentDegree: Degree | undefined   = catalog?.degrees.find(d => Number(d.id) === Number(selectedDegreeId));
    const currentSem: Semester | undefined    = currentDegree?.semesters.find(s => Number(s.id) === Number(selectedSemId));

    const refreshCatalog = useCallback(async () => {
        try {
            const res = await api.getCatalog();
            if (res.success && res.data) {
                setCatalog(res.data);
                if (assignDialog.subject) {
                    const freshSem = res.data.degrees.flatMap((d: Degree) => d.semesters).find((s: Semester) => s.id === Number(selectedSemId));
                    const freshSubject = freshSem?.subjects.find((s: Subject) => s.id === assignDialog.subject!.id) ?? null;
                    setAssignDialog(prev => ({ ...prev, subject: freshSubject }));
                }
            }
        } catch (e: unknown) { setError((e as Error).message); }
    }, [assignDialog.subject, selectedSemId]);

    const handleAssign = useCallback(async (cohortId: number) => {
        if (!assignDialog.subject) { return; }
        setSaving(true);
        try {
            await api.assignCohort(assignDialog.subject.id, cohortId);
            await refreshCatalog();
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [assignDialog.subject, refreshCatalog]);

    const handleUnassign = useCallback(async (cohortId: number) => {
        if (!assignDialog.subject) { return; }
        setSaving(true);
        try {
            await api.unassignCohort(assignDialog.subject.id, cohortId);
            await refreshCatalog();
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [assignDialog.subject, refreshCatalog]);

    if (loading) {
        return (
            <Box sx={{ p: 1 }}>
                <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* ── Page Header ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="var(--tp)" sx={{ letterSpacing: '-0.5px' }}>Cohort Registry</Typography>
                    <Typography variant="body2" color="var(--ts)">Assign Batches (Cohorts) to Subjects</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Degree selector */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--td)' }}>Degree</Typography>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <Select value={selectedDegreeId} displayEmpty onChange={e => setSelectedDegreeId(e.target.value)}
                                sx={{ borderRadius: '10px', fontSize: '0.875rem', background: 'var(--paper)' }}>
                                <MenuItem value=""><em>Select Degree</em></MenuItem>
                                {catalog?.degrees.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                    {/* Semester selector */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--td)' }}>Semester</Typography>
                        <FormControl size="small" sx={{ minWidth: 170 }} disabled={!currentDegree}>
                            <Select value={selectedSemId} displayEmpty onChange={e => setSelectedSemId(e.target.value)}
                                sx={{ borderRadius: '10px', fontSize: '0.875rem', background: 'var(--paper)' }}>
                                <MenuItem value=""><em>Select Semester</em></MenuItem>
                                {currentDegree?.semesters.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchAll} size="small" disabled={loading}
                            sx={{ color: 'var(--ts)', border: '1px solid var(--border)', borderRadius: '8px', mb: 0.25, '&:hover': { color: '#0f6cbf', background: 'rgba(15,108,191,0.08)' } }}>
                            <RefreshCw size={15} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Cohorts info ── */}
            {cohorts.length === 0 && !loading && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                    No cohorts found. Please create cohorts from the native IOMAD Admin panel first.
                </Alert>
            )}

            {/* ── Empty state: no semester selected ── */}
            {!currentSem && (
                <Box sx={{
                    border: '2px dashed var(--border)',
                    borderRadius: '16px', py: 12,
                    textAlign: 'center', color: 'var(--td)',
                }}>
                    <Users2 size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <Typography variant="body1">Select a Degree and Semester to manage batch assignments.</Typography>
                </Box>
            )}

            {/* ── Subjects table ── */}
            {currentSem && (
                <Box sx={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: 'rgba(15,108,191,0.04)', borderBottom: '2px solid var(--border)' }}>
                                {['Cohort Name', 'Assigned Batches', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{
                                        fontWeight: 800, fontSize: '0.72rem',
                                        textTransform: 'uppercase', letterSpacing: '0.08em',
                                        color: 'var(--td)', py: 1.75, px: 3,
                                        borderBottom: '2px solid var(--border)',
                                    }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ '& tr': { borderBottom: '1px solid var(--border)' } }}>
                            {currentSem.subjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ textAlign: 'center', color: 'var(--td)', fontStyle: 'italic', py: 6, px: 3 }}>
                                        No subjects in this semester. Add subjects in the Curriculum tab first.
                                    </TableCell>
                                </TableRow>
                            )}
                            <AnimatePresence>
                                {currentSem.subjects.map(subject => (
                                    <TableRow key={subject.id} sx={{ transition: 'background 0.15s', '&:hover': { background: 'var(--rh)' }, '&:last-child td': { borderBottom: 'none' } }}>
                                        <TableCell sx={{ px: 3, py: 2 }}>
                                            <Typography fontWeight={700} fontSize="0.9rem" color="var(--tp)">{subject.fullname}</Typography>
                                            <Typography variant="caption" color="var(--td)">{subject.shortname}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ px: 3, py: 2 }}>
                                            {subject.cohorts.length === 0 ? (
                                                <Typography variant="caption" color="var(--td)" fontStyle="italic">None assigned</Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                    {subject.cohorts.map(c => (
                                                        <Chip
                                                            key={c.cohortid}
                                                            label={c.cohortname}
                                                            size="small"
                                                            color="info"
                                                            sx={{ fontSize: '0.72rem', height: 24, borderRadius: '6px', fontWeight: 500 }}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ px: 3, py: 2 }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Users size={13} />}
                                                onClick={() => setAssignDialog({ open: true, subject })}
                                                sx={{
                                                    borderRadius: '8px', fontWeight: 700,
                                                    textTransform: 'none', fontSize: '0.8rem',
                                                    borderColor: 'var(--border)', color: 'var(--ts)',
                                                    '&:hover': { borderColor: '#0f6cbf', color: '#0f6cbf', background: 'rgba(15,108,191,0.05)' },
                                                }}
                                            >
                                                Manage Batches
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </Box>
            )}

            <AssignDialog
                open={assignDialog.open}
                subject={assignDialog.subject}
                availableCohorts={cohorts}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
                onClose={() => setAssignDialog({ open: false, subject: null })}
                saving={saving}
            />
        </Box>
    );
};
