import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button,
    IconButton, Alert, Tooltip, CircularProgress,
    TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, Select, MenuItem,
} from '@mui/material';
import { Plus, Trash2, RefreshCw, Layers, ChevronDown, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import * as api from '../api';
import { RichEditor } from '../RichEditor';
import type { Catalog, Degree, Semester, Subject, CurriculumSectionData } from '../types';

interface Props {
    initialDegreeId: number | null;
}

interface NameDialogProps {
    open: boolean; title: string; label: string;
    initialValue?: string; onConfirm: (name: string) => void;
    onClose: () => void; loading?: boolean;
}
const NameDialog: React.FC<NameDialogProps> = ({ open, title, label, initialValue = '', onConfirm, onClose, loading }) => {
    const [value, setValue] = useState(initialValue);
    useEffect(() => {
        if (open) { setValue(initialValue); }
    }, [open, initialValue]);
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus fullWidth label={label} value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && value.trim()) { onConfirm(value.trim()); }
                    }}
                    disabled={loading} sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ flex: 1, borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
                <Button onClick={() => onConfirm(value.trim())} variant="contained" disabled={!value.trim() || loading} sx={{ flex: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                    {loading ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const CurriculumView: React.FC<Props> = ({ initialDegreeId }) => {
    const [catalog, setCatalog]         = useState<Catalog | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [saving, setSaving]           = useState(false);

    const [selectedDegreeId, setSelectedDegreeId] = useState<number | string>(initialDegreeId ?? '');

    const [subjectDialog, setSubjectDialog] = useState<{ open: boolean; semId?: number; editing?: Subject }>({ open: false });
    const [deleteDialog, setDeleteDialog]   = useState<{ open: boolean; subject?: Subject }>({ open: false });

    // ── Expand / sections / curriculum state ────────────────────────────────
    const [expandedSubjects, setExpandedSubjects]   = useState<Record<number, boolean>>({});
    const [subjectSections, setSubjectSections]     = useState<Record<number, CurriculumSectionData[]>>({});
    const [sectionsLoading, setSectionsLoading]     = useState<Record<number, boolean>>({});
    const [curriculumModal, setCurriculumModal]     = useState<{
        open: boolean;
        courseId: number;
        courseName: string;
        sectionId: number | null;
        sectionName: string;
        curriculumText: string;
    }>({ open: false, courseId: 0, courseName: '', sectionId: null, sectionName: '', curriculumText: '' });
    const [savingCurriculum, setSavingCurriculum]   = useState(false);
    const [renameDialog, setRenameDialog]           = useState<{
        open: boolean; courseId: number; sectionId: number; currentName: string;
    }>({ open: false, courseId: 0, sectionId: 0, currentName: '' });

    // Per-semester inline add-subject input values
    const [inlineInputs, setInlineInputs] = useState<Record<number, string>>({});

    const fetchCatalog = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.getCatalog();
            if (res.success && res.data) {
                const freshDegrees = res.data.degrees;
                setCatalog(res.data);
                // Preserve the current selection on refresh; only fall back to a default
                // on the very first load when nothing is selected yet.
                setSelectedDegreeId(prev => {
                    if (prev !== '') {
                        const stillExists = freshDegrees.some(d => Number(d.id) === Number(prev));
                        if (stillExists) { return prev; }
                    }
                    // Nothing selected yet (or deleted): use initialDegreeId then first degree.
                    if (initialDegreeId !== null) { return initialDegreeId; }
                    return freshDegrees.length > 0 ? freshDegrees[0].id : '';
                });
            } else {
                setError(res.message ?? 'Failed to load catalog.');
            }
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setLoading(false); }
    }, [initialDegreeId]);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

    // Clear per-subject section state whenever the selected degree changes so
    // stale expanded/sections data from the old degree never bleeds into the new one.
    useEffect(() => {
        setExpandedSubjects({});
        setSubjectSections({});
        setSectionsLoading({});
    }, [selectedDegreeId]);

    const currentDegree: Degree | undefined = catalog?.degrees.find(d => Number(d.id) === Number(selectedDegreeId));

    // ── Local catalog patch helpers ─────────────────────────────────────────
    const patchAddSubject = useCallback((semId: number, newSub: Subject) => {
        // Signal the Moodle My Courses page to auto-reload once so the new
        // enrolment appears without requiring the user to manually refresh.
        try { localStorage.setItem('arina_prism_new_subject', '1'); } catch (_) { /* ignore */ }
        setCatalog(prev => {
            if (!prev) { return prev; }
            return {
                ...prev,
                degrees: prev.degrees.map(deg => ({
                    ...deg,
                    semesters: deg.semesters.map(sem =>
                        Number(sem.id) === Number(semId)
                            ? { ...sem, subjects: [...sem.subjects, newSub] }
                            : sem
                    ),
                })),
            };
        });
    }, []);

    const patchRenameSubject = useCallback((subjectId: number, fullname: string) => {
        setCatalog(prev => {
            if (!prev) { return prev; }
            return {
                ...prev,
                degrees: prev.degrees.map(deg => ({
                    ...deg,
                    semesters: deg.semesters.map(sem => ({
                        ...sem,
                        subjects: sem.subjects.map(s =>
                            s.id === subjectId ? { ...s, fullname } : s
                        ),
                    })),
                })),
            };
        });
    }, []);

    const patchRemoveSubject = useCallback((subjectId: number) => {
        setCatalog(prev => {
            if (!prev) { return prev; }
            return {
                ...prev,
                degrees: prev.degrees.map(deg => ({
                    ...deg,
                    semesters: deg.semesters.map(sem => ({
                        ...sem,
                        subjects: sem.subjects.filter(s => s.id !== subjectId),
                    })),
                })),
            };
        });
    }, []);

    const handleSaveSubject = useCallback(async (name: string) => {
        setSaving(true);
        try {
            if (subjectDialog.editing) {
                await api.updateSubject(subjectDialog.editing.id, name);
                patchRenameSubject(subjectDialog.editing.id, name);
            } else if (subjectDialog.semId) {
                const res = await api.createSubject(name, subjectDialog.semId);
                if (res.success && res.data) {
                    patchAddSubject(subjectDialog.semId, { id: res.data.id, fullname: res.data.fullname, shortname: res.data.shortname, cohorts: [] });
                }
            }
            setSubjectDialog({ open: false });
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [subjectDialog, patchAddSubject, patchRenameSubject]);

    const handleInlineAdd = useCallback(async (semId: number) => {
        const name = (inlineInputs[semId] ?? '').trim();
        if (!name) { return; }
        setSaving(true);
        try {
            const res = await api.createSubject(name, semId);
            if (res.success && res.data) {
                setInlineInputs(prev => ({ ...prev, [semId]: '' }));
                patchAddSubject(semId, { id: res.data.id, fullname: res.data.fullname, shortname: res.data.shortname, cohorts: [] });
            }
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [inlineInputs, patchAddSubject]);

    const handleDeleteSubject = useCallback(async () => {
        if (!deleteDialog.subject) { return; }
        setSaving(true);
        const subjectId = deleteDialog.subject.id;
        try {
            await api.deleteSubject(subjectId);
            patchRemoveSubject(subjectId);
            setDeleteDialog({ open: false });
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [deleteDialog, patchRemoveSubject]);

    // ── Curriculum handlers ─────────────────────────────────────────────────
    const handleToggleSubject = useCallback(async (subId: number) => {
        const isExpanding = !expandedSubjects[subId];
        setExpandedSubjects(prev => ({ ...prev, [subId]: !prev[subId] }));
        if (isExpanding && !subjectSections[subId]) {
            setSectionsLoading(prev => ({ ...prev, [subId]: true }));
            try {
                const res = await api.getSubjectSections(subId);
                if (res.success && res.data) {
                    setSubjectSections(prev => ({ ...prev, [subId]: res.data! }));
                }
            } catch (_) { /* silently ignore */ }
            finally { setSectionsLoading(prev => ({ ...prev, [subId]: false })); }
        }
    }, [expandedSubjects, subjectSections]);

    const handleOpenCurriculumModal = useCallback((sub: Subject, section: CurriculumSectionData | null) => {
        const nextNum = (subjectSections[sub.id] ?? []).length + 1;
        setCurriculumModal({
            open: true,
            courseId: sub.id,
            courseName: sub.fullname,
            sectionId: section?.sectionId ?? null,
            sectionName: section?.name ?? `Topic ${nextNum}`,
            curriculumText: section?.curriculumText ?? '',
        });
    }, [subjectSections]);

    const handleSaveCurriculum = useCallback(async () => {
        if (!curriculumModal.curriculumText.replace(/<[^>]*>/g, '').trim()) { return; }
        setSavingCurriculum(true);
        try {
            const res = await api.saveCurriculum(
                curriculumModal.courseId,
                curriculumModal.curriculumText,
                curriculumModal.sectionId ?? undefined,
                curriculumModal.sectionName || undefined,
            );
            if (res.success && res.data) {
                const newSectionId = res.data.sectionId;
                const storedName = curriculumModal.sectionName;
                setSubjectSections(prev => {
                    const existing = prev[curriculumModal.courseId] ?? [];
                    const idx = existing.findIndex(s => s.sectionId === newSectionId);
                    if (idx >= 0) {
                        const updated = [...existing];
                        updated[idx] = { ...updated[idx], name: storedName, hasCurriculum: true, curriculumText: curriculumModal.curriculumText };
                        return { ...prev, [curriculumModal.courseId]: updated };
                    }
                    const newSec: CurriculumSectionData = {
                        sectionId: newSectionId,
                        sectionNumber: existing.length + 1,
                        name: storedName,
                        hasCurriculum: true,
                        curriculumText: curriculumModal.curriculumText,
                    };
                    return { ...prev, [curriculumModal.courseId]: [...existing, newSec] };
                });
                // Auto-expand so user sees the new section immediately
                setExpandedSubjects(prev => ({ ...prev, [curriculumModal.courseId]: true }));
            }
            setCurriculumModal(prev => ({ ...prev, open: false }));
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSavingCurriculum(false); }
    }, [curriculumModal]);

    const handleRenameSection = useCallback(async (newName: string) => {
        const { courseId, sectionId } = renameDialog;
        setSaving(true);
        try {
            await api.renameSection(courseId, sectionId, newName);
            setSubjectSections(prev => {
                const list = prev[courseId];
                if (!list) { return prev; }
                return {
                    ...prev,
                    [courseId]: list.map(s =>
                        s.sectionId === sectionId ? { ...s, name: newName } : s
                    ),
                };
            });
            setRenameDialog({ open: false, courseId: 0, sectionId: 0, currentName: '' });
        } catch (e: unknown) { setError((e as Error).message); }
        finally { setSaving(false); }
    }, [renameDialog]);

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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="var(--tp)" sx={{ letterSpacing: '-0.5px' }}>
                        Curriculum Designer
                    </Typography>
                    <Typography variant="body2" color="var(--ts)">Add subjects to specific terms</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    {/* Degree selector */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--td)' }}>
                            Degree
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <Select
                                value={selectedDegreeId}
                                onChange={e => setSelectedDegreeId(e.target.value)}
                                sx={{ borderRadius: '10px', fontSize: '0.875rem', background: 'var(--paper)' }}
                            >
                                {catalog?.degrees.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchCatalog} size="small" disabled={loading}
                            sx={{ color: 'var(--ts)', border: '1px solid var(--border)', borderRadius: '8px', '&:hover': { color: '#0f6cbf', background: 'rgba(15,108,191,0.08)' } }}>
                            <RefreshCw size={15} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setError(null)}>{error}</Alert>}

            {/* ── No degree selected ── */}
            {!currentDegree && (
                <Box sx={{ border: '2px dashed var(--border)', borderRadius: '16px', py: 14, textAlign: 'center', color: 'var(--td)' }}>
                    <Layers size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <Typography variant="body1">Select a Degree above to start building the curriculum</Typography>
                </Box>
            )}

            {/* ── 4-column term grid ── */}
            {currentDegree && (
                (currentDegree.semesters?.length ?? 0) === 0 ? (
                    <Box sx={{ border: '2px dashed var(--border)', borderRadius: '16px', py: 10, textAlign: 'center', color: 'var(--td)' }}>
                        <Layers size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                        <Typography>This degree has no semesters yet. Go to Academic Catalog to add.</Typography>
                    </Box>
                ) : (
                    <Box key={String(selectedDegreeId)} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2.5 }}>
                            {(currentDegree.semesters ?? []).map((s: Semester, idx: number) => (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                                    style={{
                                        background: 'var(--paper)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 14,
                                        boxShadow: 'var(--shadow)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 200,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Card header */}
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        px: 2, py: 1.25,
                                        background: 'rgba(15,108,191,0.03)',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--tp)' }}>
                                            {s.name}
                                        </Typography>
                                        <Box sx={{
                                            background: 'rgba(15,108,191,0.1)',
                                            color: '#0f6cbf',
                                            fontWeight: 700, fontSize: '0.65rem',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            px: 1, py: 0.25, borderRadius: '20px',
                                        }}>
                                            {s.subjects?.length ?? 0} Subjects
                                        </Box>
                                    </Box>

                                    {/* Card body: subjects */}
                                    <Box sx={{ flex: 1, px: 1.5, py: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75, minHeight: 100 }}>
                                        {(s.subjects?.length ?? 0) === 0 ? (
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                                                <Typography sx={{ fontSize: '0.8rem', color: 'var(--td)', fontStyle: 'italic' }}>
                                                    Empty {currentDegree.metadata?.cycle_type ?? 'Semester'}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            (s.subjects ?? []).map((sub: Subject) => {
                                                const isExpanded = !!expandedSubjects[sub.id];
                                                const sections   = subjectSections[sub.id] ?? [];
                                                const loadingSec = !!sectionsLoading[sub.id];
                                                return (
                                                <Box key={sub.id} sx={{ mb: 0.5 }}>
                                                    <Box
                                                        className="subject-pill"
                                                        sx={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            px: 1.25, py: 0.75,
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--paper)',
                                                            transition: 'border-color 0.15s, background 0.15s',
                                                            '&:hover': { borderColor: 'rgba(15,108,191,0.3)', background: 'rgba(15,108,191,0.03)' },
                                                            '&:hover .action-btns': { opacity: 1 },
                                                        }}
                                                    >
                                                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--ts)', fontWeight: 500, flex: 1, pr: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {sub.fullname}
                                                    </Typography>
                                                    <Box className="action-btns" sx={{ display: 'flex', alignItems: 'center', gap: 0.25, opacity: 0, transition: 'opacity 0.15s' }}>
                                                        <Tooltip title="Add Chapter/Topic/Units">
                                                            <IconButton size="small"
                                                                onClick={() => handleOpenCurriculumModal(sub, null)}
                                                                sx={{ color: '#0f6cbf', p: 0.25 }}>
                                                                <Plus size={13} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={isExpanded ? 'Collapse' : 'Show sections'}>
                                                            <IconButton size="small"
                                                                onClick={() => { void handleToggleSubject(sub.id); }}
                                                                sx={{ color: 'var(--td)', p: 0.25 }}>
                                                                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
                                                                    <ChevronDown size={13} />
                                                                </motion.span>
                                                            </IconButton>
                                                        </Tooltip>
                                                        <IconButton size="small"
                                                            onClick={() => setDeleteDialog({ open: true, subject: sub })}
                                                            sx={{ color: 'var(--td)', p: 0.25, transition: 'color 0.15s', '&:hover': { color: '#e53935' } }}>
                                                            <Trash2 size={13} />
                                                        </IconButton>
                                                    </Box>
                                                </Box>

                                                {/* Curriculum sections list */}
                                                <AnimatePresence initial={false}>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            style={{ overflow: 'hidden' }}
                                                        >
                                                            <Box sx={{ pl: 1.5, pt: 0.5, pb: 0.5 }}>
                                                                {loadingSec ? (
                                                                    <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
                                                                        <CircularProgress size={14} />
                                                                    </Box>
                                                                ) : sections.length === 0 ? (
                                                                    <Typography sx={{ fontSize: '0.72rem', color: 'var(--td)', py: 0.75, fontStyle: 'italic', textAlign: 'center' }}>
                                                                        No sections yet — click + to add curriculum
                                                                    </Typography>
                                                                ) : (
                                                                    sections.map(sec => (
                                                                        <Box
                                                                            key={sec.sectionId}
                                                                            onClick={() => handleOpenCurriculumModal(sub, sec)}
                                                                            sx={{
                                                                                display: 'flex', alignItems: 'center', gap: 1,
                                                                                px: 1, py: 0.5, mb: 0.25,
                                                                                borderRadius: '0 6px 6px 0',
                                                                                borderLeft: '2px solid rgba(15,108,191,0.25)',
                                                                                ml: 0.5, cursor: 'pointer',
                                                                                transition: 'background 0.12s',
                                                                                '&:hover': { background: 'var(--rh)' },
                                                                            }}
                                                                        >
                                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: sec.hasCurriculum ? '#28a745' : 'var(--td)', flexShrink: 0 }} />
                                                                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--ts)', flex: 1 }}>
                                                                                {sec.name}
                                                                            </Typography>
                                                                            <Pencil size={11} style={{ color: 'var(--td)', opacity: 0.5, flexShrink: 0 }} />
                                                                        </Box>
                                                                    ))
                                                                )}
                                                            </Box>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </Box>
                                                );
                                            })
                                        )}
                                    </Box>

                                    {/* Card footer: inline input */}
                                    <Box sx={{ borderTop: '1px solid var(--border)', px: 1.5, py: 1.25 }}>
                                        <Box sx={{ position: 'relative' }}>
                                            <input
                                                placeholder="Add subject..."
                                                value={inlineInputs[s.id] ?? ''}
                                                onChange={e => setInlineInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') { void handleInlineAdd(s.id); } }}
                                                style={{
                                                    width: '100%',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 8,
                                                    padding: '6px 36px 6px 10px',
                                                    background: 'var(--rh)',
                                                    color: 'var(--tp)',
                                                    fontFamily: 'inherit',
                                                    outline: 'none',
                                                    transition: 'border-color 0.15s',
                                                    boxSizing: 'border-box',
                                                }}
                                                onFocus={e => { e.currentTarget.style.borderColor = '#0f6cbf'; }}
                                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                disabled={saving}
                                            />
                                            <button
                                                onClick={() => void handleInlineAdd(s.id)}
                                                disabled={saving || !(inlineInputs[s.id] ?? '').trim()}
                                                style={{
                                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: '#0f6cbf', display: 'flex', alignItems: 'center', padding: 2,
                                                    opacity: (inlineInputs[s.id] ?? '').trim() ? 1 : 0.3,
                                                }}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                    </Box>
                )
            )}

            {/* ── Dialogs ── */}
            <NameDialog
                open={subjectDialog.open}
                title={subjectDialog.editing ? 'Edit Subject' : 'Add Subject'}
                label="Subject Name"
                initialValue={subjectDialog.editing?.fullname ?? ''}
                onConfirm={handleSaveSubject}
                onClose={() => setSubjectDialog({ open: false })}
                loading={saving}
            />
            {/* Delete Subject Dialog */}
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Subject?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to delete <strong>&ldquo;{deleteDialog.subject?.fullname}&rdquo;</strong>?
                        This will permanently remove this subject (Moodle course) and all its content.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDeleteDialog({ open: false })} variant="outlined" disabled={saving} sx={{ flex: 1, borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleDeleteSubject} variant="contained" color="error" disabled={saving}
                        sx={{ flex: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                        {saving ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Rename Topic Dialog ── */}
            <NameDialog
                open={renameDialog.open}
                title="Rename Topic"
                label="Topic name"
                initialValue={renameDialog.currentName}
                onConfirm={handleRenameSection}
                onClose={() => setRenameDialog({ open: false, courseId: 0, sectionId: 0, currentName: '' })}
                loading={saving}
            />

            {/* ── Curriculum Modal ── */}
            <Dialog
                open={curriculumModal.open}
                onClose={() => setCurriculumModal(prev => ({ ...prev, open: false }))}
                maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: '16px', border: '1px solid var(--border)' } }}
            >
                <DialogTitle sx={{ pb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--tp)' }}>
                        {curriculumModal.courseName}
                    </Typography>
                    {/* Editable topic/section name */}
                    <TextField
                        variant="standard"
                        value={curriculumModal.sectionName}
                        onChange={e => setCurriculumModal(prev => ({ ...prev, sectionName: e.target.value }))}
                        disabled={savingCurriculum}
                        placeholder="Topic name…"
                        fullWidth
                        sx={{
                            mt: 0.5,
                            '& .MuiInput-root': { fontSize: '0.85rem', color: 'var(--ts)' },
                            '& .MuiInput-underline:before': { borderBottomColor: 'var(--border)' },
                            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: '#0f6cbf' },
                        }}
                    />
                </DialogTitle>
                <DialogContent>
                    {/* Non-editable "Curriculum" heading badge */}
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.5, mt: 1, mb: 2,
                        background: 'rgba(15,108,191,0.08)',
                        border: '1px solid rgba(15,108,191,0.2)',
                        borderRadius: '6px',
                    }}>
                        <Layers size={13} style={{ color: '#0f6cbf' }} />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f6cbf', userSelect: 'none' }}>
                            Curriculum
                        </Typography>
                    </Box>
                    <RichEditor
                        key={`${curriculumModal.courseId}-${curriculumModal.sectionId ?? 'new'}`}
                        value={curriculumModal.curriculumText}
                        onChange={html => setCurriculumModal(prev => ({ ...prev, curriculumText: html }))}
                        disabled={savingCurriculum}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={() => setCurriculumModal(prev => ({ ...prev, open: false }))}
                        variant="outlined" disabled={savingCurriculum}
                        sx={{ flex: 1, borderRadius: '10px', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => { void handleSaveCurriculum(); }}
                        variant="contained"
                        disabled={savingCurriculum || !curriculumModal.curriculumText.replace(/<[^>]*>/g, '').trim()}
                        sx={{ flex: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                    >
                        {savingCurriculum ? 'Saving…' : 'Save section'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
