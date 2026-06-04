// ── Moodle context injected by college_admin.php ──────────────────────────────
export interface MoodleCollegeAdminContext {
    wwwroot: string;
    sesskey: string;
    userid: number;
    username: string;
    useremail?: string;
    orgid?: string | null;
    isCompanyManager: boolean;
    companyId: number | null;
    companyCatId: number | null;
}

declare global {
    interface Window {
        MOODLE_COLLEGE_ADMIN_CONTEXT: MoodleCollegeAdminContext;
    }
}

// ── Domain Types ──────────────────────────────────────────────────────────────

export interface CohortRef {
    cohortid: number;
    cohortname: string;
}

export interface Subject {
    id: number;
    fullname: string;
    shortname: string;
    cohorts: CohortRef[];
}

export interface Semester {
    id: number;
    name: string;
    subjects: Subject[];
}

export interface DegreeMetadata {
    cycle_type: 'semester' | 'trimester' | 'annual' | 'quarterly';
    start_date: number; // unix timestamp
    num_cycles: number;
}

export interface Degree {
    id: number;
    name: string;
    semesters: Semester[];
    metadata?: DegreeMetadata;
}

export interface Catalog {
    degrees: Degree[];
}

export interface CurriculumSectionData {
    sectionId: number;
    sectionNumber: number;
    name: string;
    hasCurriculum: boolean;
    curriculumText: string;
}

export interface Cohort {
    id: number;
    name: string;
    idnumber: string;
}

// ── API Response wrapper ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
}
