/**
 * API client for the College Admin dashboard.
 * All calls go to api/cms/college_admin_api.php using the Moodle sesskey.
 */

import type { ApiResponse, Catalog, Cohort, DegreeMetadata, CurriculumSectionData } from './types';

const ctx = window.MOODLE_COLLEGE_ADMIN_CONTEXT;
const API_URL = `${ctx.wwwroot}/local/arina_prism_sense/api/cms/college_admin_api.php`;

const WRITE_ACTIONS = new Set([
    'create_degree', 'update_degree', 'update_degree_meta', 'delete_degree',
    'create_semester', 'update_semester', 'delete_semester',
    'create_subject', 'update_subject', 'delete_subject',
    'assign_cohort', 'unassign_cohort',
    'save_curriculum', 'rename_section',
]);

async function callApi<T>(params: Record<string, string | number>): Promise<ApiResponse<T>> {
    const body = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
        body.append(key, String(val));
    }
    // Only append sesskey for write operations (CSRF protection).
    if (WRITE_ACTIONS.has(String(params['action']))) {
        body.append('sesskey', ctx.sesskey);
    }

    const res = await fetch(API_URL, { method: 'POST', body, credentials: 'include' });

    // Safely parse response — PHP may return HTML on session expiry or fatal errors.
    const text = await res.text();
    try {
        return JSON.parse(text) as ApiResponse<T>;
    } catch {
        throw new Error(
            `Server returned non-JSON response (HTTP ${res.status}): ${text.substring(0, 300)}`
        );
    }
}

// ── Catalog ────────────────────────────────────────────────────────────────────

export const getCatalog = () =>
    callApi<Catalog>({ action: 'get_catalog' });

// ── Degree ─────────────────────────────────────────────────────────────────────

export const createDegree = (name: string, meta: DegreeMetadata) =>
    callApi<{ id: number; name: string }>({
        action: 'create_degree',
        name,
        cycle_type: meta.cycle_type,
        start_date: meta.start_date,
        num_cycles: meta.num_cycles,
    });

export const updateDegree = (id: number, name: string) =>
    callApi<void>({ action: 'update_degree', id, name });

export const updateDegreeMeta = (id: number, meta: DegreeMetadata) =>
    callApi<void>({
        action: 'update_degree_meta',
        id,
        cycle_type: meta.cycle_type,
        start_date: meta.start_date,
        num_cycles: meta.num_cycles,
    });

export const deleteDegree = (id: number) =>
    callApi<void>({ action: 'delete_degree', id });

// ── Semester ───────────────────────────────────────────────────────────────────

export const createSemester = (name: string, degree_id: number) =>
    callApi<{ id: number; name: string }>({ action: 'create_semester', name, degree_id });

export const updateSemester = (id: number, name: string) =>
    callApi<void>({ action: 'update_semester', id, name });

export const deleteSemester = (id: number) =>
    callApi<void>({ action: 'delete_semester', id });

// ── Subject ────────────────────────────────────────────────────────────────────

export const createSubject = (fullname: string, semester_id: number) =>
    callApi<{ id: number; fullname: string; shortname: string }>({
        action: 'create_subject', fullname, semester_id,
    });

export const updateSubject = (id: number, fullname: string) =>
    callApi<void>({ action: 'update_subject', id, fullname });

export const deleteSubject = (id: number) =>
    callApi<void>({ action: 'delete_subject', id });

// ── Cohorts ────────────────────────────────────────────────────────────────────

export const getCohorts = () =>
    callApi<Cohort[]>({ action: 'get_cohorts' });

export const assignCohort = (course_id: number, cohort_id: number) =>
    callApi<void>({ action: 'assign_cohort', course_id, cohort_id });

export const unassignCohort = (course_id: number, cohort_id: number) =>
    callApi<void>({ action: 'unassign_cohort', course_id, cohort_id });

// ── Curriculum ─────────────────────────────────────────────────────────────────

export const getSubjectSections = (course_id: number) =>
    callApi<CurriculumSectionData[]>({ action: 'get_subject_sections', course_id });

export const saveCurriculum = (
    course_id: number,
    curriculum_text: string,
    section_id?: number,
    section_name?: string,
) =>
    callApi<{ action: string; sectionId: number; cmid: number }>({
        action: 'save_curriculum',
        course_id,
        curriculum_text,
        ...(section_id ? { section_id } : {}),
        ...(section_name ? { section_name } : {}),
    });

export const renameSection = (course_id: number, section_id: number, name: string) =>
    callApi<{ name: string }>({ action: 'rename_section', course_id, section_id, name });
