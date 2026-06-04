<?php

/**
 * College Admin Dashboard API — AJAX handler
 *
 * Handles all AJAX requests from the College Admin React frontend.
 * Uses Moodle's native PHP functions internally, bypassing the
 * "Callable from AJAX: No" restriction on standard Web Services.
 *
 * All operations are scoped to the Company Manager's own company.
 *
 * Operations (POST param: action):
 *   get_catalog        — Fetch all degrees, semesters, and subjects for this company
 *   create_degree      — Create a new Degree (Moodle Category under company root)
 *   update_degree      — Rename an existing Degree category
 *   delete_degree      — Delete a Degree category (and its sub-categories/courses)
 *   create_semester    — Create a Semester (Moodle Sub-Category under a Degree)
 *   update_semester    — Rename a Semester
 *   delete_semester    — Delete a Semester
 *   create_subject     — Create a Subject (Moodle Course inside a Semester) + IOMAD assign
 *   update_subject     — Rename a Subject course
 *   delete_subject     — Delete a Subject course
 *   get_cohorts        — Fetch cohorts available to this company
 *   assign_cohort      — Enrol a cohort into a Subject course via cohort sync enrolment
 *   unassign_cohort    — Remove a cohort sync enrolment from a Subject course
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->libdir . '/enrollib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->dirroot . '/mod/label/lib.php');

use local_arina_prism_sense\CompanyConfig;

// ── Security ─────────────────────────────────────────────────────────────────

require_login();
CompanyConfig::requireCmsAccess();

if (!CompanyConfig::isIomadInstalled()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'IOMAD is not installed.']);
    exit;
}

// Validate sesskey on every write operation (CSRF protection).
$action = required_param('action', PARAM_ALPHANUMEXT);
$writableActions = [
    'create_degree', 'update_degree', 'delete_degree',
    'create_semester', 'update_semester', 'delete_semester',
    'create_subject', 'update_subject', 'delete_subject',
    'assign_cohort', 'unassign_cohort',
    'save_curriculum', 'rename_section',
];
if (in_array($action, $writableActions)) {
    require_sesskey();
}

header('Content-Type: application/json');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the IOMAD company root Moodle category ID for the current user.
 * Throws an exception if the company or its category cannot be found.
 */
function get_company_root_cat(): int
{
    global $DB;
    $companyId = CompanyConfig::getCompanyId();
    if (!$companyId) {
        throw new \moodle_exception('nopermissions', 'error');
    }
    $tComp = CompanyConfig::getIomadTable('company');
    $catId = $DB->get_field($tComp, 'category', ['id' => $companyId]);
    if (!$catId) {
        throw new \moodle_exception('error', 'local_arina_prism_sense', '', null, 'Company has no root category.');
    }
    return (int) $catId;
}

/**
 * Assert that a given category ID is a descendant of the company root category.
 * Prevents managers from modifying categories belonging to other companies.
 */
function assert_category_in_company(int $catId): void
{
    $rootCatId = get_company_root_cat();
    $cat = \core_course_category::get($catId, MUST_EXIST, true);
    // Build path check: the category path includes all ancestor IDs.
    $path = $cat->path; // e.g. "/1/12/34"
    $parts = explode('/', trim($path, '/'));
    if (!in_array((string) $rootCatId, $parts) && $catId !== $rootCatId) {
        throw new \moodle_exception('nopermissions', 'error');
    }
}

/**
 * Assert that a given course is a descendant of the company root category.
 */
function assert_course_in_company(int $courseId): void
{
    global $DB;
    $catId = (int) $DB->get_field('course', 'category', ['id' => $courseId], MUST_EXIST);
    assert_category_in_company($catId);
}

/**
 * Get all immediate child categories of a given parent category ID.
 */
function get_child_categories(int $parentId): array
{
    $children = \core_course_category::get($parentId)->get_children();
    $result = [];
    foreach ($children as $child) {
        $result[] = [
            'id'   => (int) $child->id,
            'name' => $child->name,
        ];
    }
    return $result;
}

/**
 * Get all courses directly in a given category ID.
 */
function get_courses_in_category(int $catId): array
{
    $cat = \core_course_category::get($catId);
    $courses = $cat->get_courses(['recursive' => false]);
    $result = [];
    foreach ($courses as $course) {
        $result[] = [
            'id'        => (int) $course->id,
            'fullname'  => $course->fullname,
            'shortname' => $course->shortname,
        ];
    }
    return $result;
}

/**
 * Get cohort enrolments for a given course.
 * Returns array of cohort IDs that are enrolled via cohort sync.
 */
function get_cohort_enrolments(int $courseId): array
{
    global $DB;
    $sql = "SELECT e.customint1 AS cohortid, c.name AS cohortname
              FROM {enrol} e
              JOIN {cohort} c ON c.id = e.customint1
             WHERE e.courseid = :courseid
               AND e.enrol = 'cohort'";
    $rows = $DB->get_records_sql($sql, ['courseid' => $courseId]);
    $result = [];
    foreach ($rows as $row) {
        $result[] = [
            'cohortid'   => (int) $row->cohortid,
            'cohortname' => $row->cohortname,
        ];
    }
    return $result;
}

// ── Constants ───────────────────────────────────────────────────────────────
define('CYCLE_MONTHS_UNIT', ' months');

// ── Action dispatcher ─────────────────────────────────────────────────────────

try {
    global $DB;
    $companyId = CompanyConfig::getCompanyId();

    switch ($action) {

        // ── READ: Full catalog ─────────────────────────────────────────────────
        case 'get_catalog': {
            $rootCatId = get_company_root_cat();
            $degrees = get_child_categories($rootCatId);

            foreach ($degrees as &$degree) {
                $degree['semesters'] = get_child_categories($degree['id']);
                foreach ($degree['semesters'] as &$semester) {
                    $courses = get_courses_in_category($semester['id']);
                    foreach ($courses as &$course) {
                        $course['cohorts'] = get_cohort_enrolments($course['id']);
                    }
                    unset($course);
                    $semester['subjects'] = $courses;
                }
                unset($semester);

                // Fetch metadata for the degree.
                $meta = $DB->get_record('local_arina_prism_sense_degree_meta', ['categoryid' => $degree['id']]);
                if ($meta) {
                    $degree['metadata'] = [
                        'cycle_type' => $meta->cycle_type,
                        'start_date' => (int)$meta->startdate,
                        'num_cycles' => (int)$meta->num_cycles,
                    ];
                }
            }
            unset($degree);

            echo json_encode(['success' => true, 'data' => ['degrees' => $degrees]]);
            break;
        }

        // ── CREATE: Degree (Category under company root) ───────────────────────
        case 'create_degree': {
            $name = required_param('name', PARAM_TEXT);
            $cycleType = required_param('cycle_type', PARAM_TEXT);
            $startDate = required_param('start_date', PARAM_INT);
            $numCycles = required_param('num_cycles', PARAM_INT);

            if (trim($name) === '') {
                throw new \invalid_parameter_exception('Degree name cannot be empty.');
            }

            $rootCatId = get_company_root_cat();
            
            // Ensure degree name is unique within this company
            $existingCats = get_child_categories($rootCatId);
            foreach ($existingCats as $child) {
                if (strtolower($child['name']) === strtolower(trim($name))) {
                    throw new \invalid_parameter_exception("A degree named '{$name}' already exists.");
                }
            }

            // Create the Moodle category for the degree.
            $data = (object)[
                'name'             => trim($name),
                'parent'           => $rootCatId,
                'idnumber'         => '',
                'description'      => '',
                'descriptionformat' => FORMAT_HTML,
            ];
            $newCat = \core_course_category::create($data);

            // Insert metadata into the degree_meta table.
            $DB->insert_record(
                'local_arina_prism_sense_degree_meta',
                (object)[
                    'categoryid'   => $newCat->id,
                    'cycle_type'   => $cycleType,
                    'startdate'    => $startDate,
                    'num_cycles'   => $numCycles,
                    'timecreated'  => time(),
                    'timemodified' => time(),
                ]
            );

            // Auto-generate semester/term categories based on cycle_type.
            $cycleLabel = match($cycleType) {
                'trimester' => 'Trimester',
                'quarterly' => 'Quarter',
                'annual'    => 'Year',
                default     => 'Semester',
            };
            $monthsPerCycle = match($cycleType) {
                'trimester' => 4,
                'quarterly' => 3,
                'annual'    => 12,
                default     => 6,
            };
            for ($i = 1; $i <= $numCycles; $i++) {
                $semData = (object)[
                    'name'              => "{$cycleLabel} {$i}",
                    'parent'            => $newCat->id,
                    'idnumber'          => '',
                    'description'       => '',
                    'descriptionformat' => FORMAT_HTML,
                ];
                $newSem    = \core_course_category::create($semData);
                $cycleStart = strtotime('+' . (($i - 1) * $monthsPerCycle) . CYCLE_MONTHS_UNIT, $startDate);
                $cycleEnd   = strtotime('+' . ($i * $monthsPerCycle) . CYCLE_MONTHS_UNIT, $startDate) - 1;
                $DB->insert_record(
                    'local_arina_prism_sense_cycle_meta',
                    (object)[
                        'categoryid'  => $newSem->id,
                        'startdate'   => $cycleStart,
                        'enddate'     => $cycleEnd,
                        'timecreated' => time(),
                    ]
                );
            }

            echo json_encode(['success' => true, 'data' => ['id' => $newCat->id, 'name' => $newCat->name]]);
            break;
        }

        // ── UPDATE: Degree or Semester ─────────────────────────────────────────
        case 'update_degree':
        case 'update_semester': {
            $catId = required_param('id', PARAM_INT);
            $name  = required_param('name', PARAM_TEXT);
            assert_category_in_company($catId);
            $cat = \core_course_category::get($catId, MUST_EXIST, true);
            $cat->update(['name' => trim($name)]);
            echo json_encode(['success' => true]);
            break;
        }

        // ── UPDATE: Degree metadata ─────────────────────────────────────────────
        case 'update_degree_meta': {
            $degreeId  = required_param('id', PARAM_INT);
            $cycleType = required_param('cycle_type', PARAM_TEXT);
            $startDate = required_param('start_date', PARAM_INT);
            $numCycles = required_param('num_cycles', PARAM_INT);

            assert_category_in_company($degreeId);

            // 1. Persist metadata.
            $metaRow = $DB->get_record('local_arina_prism_sense_degree_meta', ['categoryid' => $degreeId]);
            if ($metaRow) {
                $DB->update_record(
                    'local_arina_prism_sense_degree_meta',
                    (object)[
                        'id'           => $metaRow->id,
                        'cycle_type'   => $cycleType,
                        'startdate'    => $startDate,
                        'num_cycles'   => $numCycles,
                        'timemodified' => time(),
                    ]
                );
            } else {
                $DB->insert_record(
                    'local_arina_prism_sense_degree_meta',
                    (object)[
                        'categoryid'   => $degreeId,
                        'cycle_type'   => $cycleType,
                        'startdate'    => $startDate,
                        'num_cycles'   => $numCycles,
                        'timecreated'  => time(),
                        'timemodified' => time(),
                    ]
                );
            }

            // 2. Sync Moodle category structure to match new cycle_type + num_cycles.
            $cycleLabel = match($cycleType) {
                'trimester' => 'Trimester',
                'quarterly' => 'Quarter',
                'annual'    => 'Year',
                default     => 'Semester',
            };

            $existingCycles = get_child_categories($degreeId);
            $existingCount  = count($existingCycles);

            // Rename existing cycles to match the new cycle label (e.g. "Semester 1" → "Year 1").
            foreach ($existingCycles as $i => $cycle) {
                $newName = $cycleLabel . ' ' . ($i + 1);
                if ($cycle['name'] !== $newName) {
                    $cat = \core_course_category::get((int)$cycle['id'], MUST_EXIST, true);
                    $cat->update(['name' => $newName]);
                }
            }

            // Add new cycles if num_cycles increased.
            for ($i = $existingCount + 1; $i <= $numCycles; $i++) {
                $semData = (object)[
                    'name'              => $cycleLabel . ' ' . $i,
                    'parent'            => $degreeId,
                    'idnumber'          => '',
                    'description'       => '',
                    'descriptionformat' => FORMAT_HTML,
                ];
                \core_course_category::create($semData);
            }

            // Remove trailing empty cycles if num_cycles decreased.
            // Only deletes cycles that have no courses — never destroys content.
            if ($numCycles < $existingCount) {
                $toDelete = array_reverse(array_slice($existingCycles, $numCycles));
                foreach ($toDelete as $cycle) {
                    $cat = \core_course_category::get((int)$cycle['id'], IGNORE_MISSING, true);
                    if (!$cat) {
                        continue;
                    }
                    $courses = get_courses_in_category((int)$cycle['id']);
                    if (empty($courses)) {
                        // Remove orphaned cycle_meta before deleting the category.
                        $DB->delete_records('local_arina_prism_sense_cycle_meta', ['categoryid' => (int)$cycle['id']]);
                        $cat->delete_full(false);
                    }
                }
            }

            // ── Sync cycle date metadata ───────────────────────────────────────
            // Re-fetch cycle list after structural changes (adds/removes may have changed it).
            $monthsPerCycle = match($cycleType) {
                'trimester' => 4,
                'quarterly' => 3,
                'annual'    => 12,
                default     => 6, // semester
            };
            $currentCycles = get_child_categories($degreeId);
            foreach ($currentCycles as $idx => $cycle) {
                $cycleNumber = $idx + 1;
                $cycleStart  = strtotime('+' . (($cycleNumber - 1) * $monthsPerCycle) . CYCLE_MONTHS_UNIT, $startDate);
                $cycleEnd    = strtotime('+' . ($cycleNumber * $monthsPerCycle) . CYCLE_MONTHS_UNIT, $startDate) - 1;

                $existingMeta = $DB->get_record(
                    'local_arina_prism_sense_cycle_meta',
                    ['categoryid' => (int)$cycle['id']]
                );
                if ($existingMeta) {
                    $DB->update_record(
                        'local_arina_prism_sense_cycle_meta',
                        (object)[
                            'id'        => $existingMeta->id,
                            'startdate' => $cycleStart,
                            'enddate'   => $cycleEnd,
                        ]
                    );
                } else {
                    $DB->insert_record(
                        'local_arina_prism_sense_cycle_meta',
                        (object)[
                            'categoryid'  => (int)$cycle['id'],
                            'startdate'   => $cycleStart,
                            'enddate'     => $cycleEnd,
                            'timecreated' => time(),
                        ]
                    );
                }

                // Propagate updated dates to all courses inside this cycle.
                $coursesInCycle = get_courses_in_category((int)$cycle['id']);
                foreach ($coursesInCycle as $course) {
                    $DB->set_field('course', 'startdate', $cycleStart, ['id' => (int)$course['id']]);
                    $DB->set_field('course', 'enddate', $cycleEnd, ['id' => (int)$course['id']]);
                }
            }

            echo json_encode(['success' => true]);
            break;
        }

        // ── DELETE: Degree ─────────────────────────────────────────────────────
        case 'delete_degree': {
            $catId = required_param('id', PARAM_INT);
            assert_category_in_company($catId);

            $transaction = $DB->start_delegated_transaction();
            try {
                // Delete metadata from the degree_meta table.
                $DB->delete_records('local_arina_prism_sense_degree_meta', ['categoryid' => $catId]);

                $cat = \core_course_category::get($catId, MUST_EXIST, true);
                $cat->delete_full(false);
                
                $transaction->allow_commit();
            } catch (\Exception $e) {
                $transaction->rollback($e);
                throw $e;
            }
            
            echo json_encode(['success' => true]);
            break;
        }

        // ── CREATE: Semester (Sub-category under a Degree) ────────────────────
        case 'create_semester': {
            $name     = required_param('name', PARAM_TEXT);
            $degreeId = required_param('degree_id', PARAM_INT);
            if (trim($name) === '') {
                throw new \invalid_parameter_exception('Semester name cannot be empty.');
            }
            assert_category_in_company($degreeId);

            $data = (object)[
                'name'             => trim($name),
                'parent'           => $degreeId,
                'idnumber'         => '',
                'description'      => '',
                'descriptionformat' => FORMAT_HTML,
            ];
            $newCat = \core_course_category::create($data);
            echo json_encode(['success' => true, 'data' => ['id' => $newCat->id, 'name' => $newCat->name]]);
            break;
        }

        // ── DELETE: Semester ───────────────────────────────────────────────────
        case 'delete_semester': {
            $catId = required_param('id', PARAM_INT);
            assert_category_in_company($catId);
            $cat = \core_course_category::get($catId, MUST_EXIST, true);
            $cat->delete_full(false);
            echo json_encode(['success' => true]);
            break;
        }

        // ── CREATE: Subject (Course inside a Semester) ────────────────────────
        case 'create_subject': {
            $fullname   = required_param('fullname', PARAM_TEXT);
            $semesterId = required_param('semester_id', PARAM_INT);
            if (trim($fullname) === '') {
                throw new \invalid_parameter_exception('Subject name cannot be empty.');
            }
            assert_category_in_company($semesterId);

            // Generate a unique short name.
            $base      = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $fullname));
            $shortname = substr($base, 0, 16) . '_' . bin2hex(random_bytes(4));

            $coursedata = (object)[
                'fullname'         => trim($fullname),
                'shortname'        => $shortname,
                'category'         => $semesterId,
                'visible'          => 1,
                'format'           => 'topics',
                'summaryformat'    => FORMAT_HTML,
                'summary'          => '',
            ];
            // Inherit start/end dates from the parent cycle's metadata if available.
            $cycleMeta = $DB->get_record('local_arina_prism_sense_cycle_meta', ['categoryid' => $semesterId]);
            if ($cycleMeta) {
                $coursedata->startdate = (int)$cycleMeta->startdate;
                $coursedata->enddate   = (int)$cycleMeta->enddate;
            }
            $newCourse = create_course($coursedata);

            // Assign the course to the IOMAD company so it appears in IOMAD.
            if ($companyId && function_exists('iomad')) {
                // Use the iomad library if available.
                require_once($CFG->dirroot . '/local/iomad/lib/iomad.php');
                \iomad::add_company_course($companyId, $newCourse->id);
            } elseif ($companyId) {
                // Fallback: direct DB insert if iomad lib not reachable via function.
                $tCompCourse = CompanyConfig::getIomadTable('company_course');
                $exists = $DB->record_exists($tCompCourse, [
                    'companyid' => $companyId,
                    'courseid'  => $newCourse->id,
                ]);
                if (!$exists) {
                    $DB->insert_record(
                        $tCompCourse,
                        (object)[
                            'companyid'    => $companyId,
                            'courseid'     => $newCourse->id,
                            'departmentid' => 0,
                            'owned'        => 1,
                        ]
                    );
                }
            }

            // Enrol the current user as editing teacher so the course appears in their Moodle dashboard.
            $teacherRoleId = $DB->get_field('role', 'id', ['shortname' => 'editingteacher']);
            if ($teacherRoleId) {
                enrol_try_internal_enrol($newCourse->id, $USER->id, (int)$teacherRoleId);
                // Force Moodle to write the updated enrolment/capability data back to the
                // PHP session immediately, so the next page load sees the new course without
                // the user needing to manually reload My Courses.
                reload_all_capabilities();
            }

            echo json_encode([
                'success' => true,
                'data'    => [
                    'id'        => $newCourse->id,
                    'fullname'  => $newCourse->fullname,
                    'shortname' => $newCourse->shortname,
                ],
            ]);
            break;
        }

        // ── UPDATE: Subject ────────────────────────────────────────────────────
        case 'update_subject': {
            $courseId = required_param('id', PARAM_INT);
            $fullname = required_param('fullname', PARAM_TEXT);
            assert_course_in_company($courseId);
            $course = $DB->get_record('course', ['id' => $courseId], '*', MUST_EXIST);
            $course->fullname = trim($fullname);
            update_course($course);
            echo json_encode(['success' => true]);
            break;
        }

        // ── DELETE: Subject ────────────────────────────────────────────────────
        case 'delete_subject': {
            $courseId = required_param('id', PARAM_INT);
            assert_course_in_company($courseId);
            delete_course($courseId, false);
            echo json_encode(['success' => true]);
            break;
        }

        // ── READ: Available Cohorts ────────────────────────────────────────────
        case 'get_cohorts': {
            // Fetch cohorts scoped to this company's root category.
            // IOMAD-created cohorts are typically stored at context_system level
            // or at the company category level. We fetch both.
            $rootCatId = get_company_root_cat();
            $catContext = \context_coursecat::instance($rootCatId);
            $sysContext = \context_system::instance();

            $cohorts = [];
            // System-level cohorts (visible to everyone).
            $sysCohorts = $DB->get_records(
                'cohort',
                ['contextid' => $sysContext->id],
                'name ASC',
                'id, name, idnumber'
            );
            foreach ($sysCohorts as $c) {
                $cohorts[(int)$c->id] = ['id' => (int)$c->id, 'name' => $c->name, 'idnumber' => $c->idnumber];
            }
            // Company category-level cohorts.
            $catCohorts = $DB->get_records(
                'cohort',
                ['contextid' => $catContext->id],
                'name ASC',
                'id, name, idnumber'
            );
            foreach ($catCohorts as $c) {
                $cohorts[(int)$c->id] = ['id' => (int)$c->id, 'name' => $c->name, 'idnumber' => $c->idnumber];
            }

            echo json_encode(['success' => true, 'data' => array_values($cohorts)]);
            break;
        }

        // ── ASSIGN: Cohort to Subject ──────────────────────────────────────────
        case 'assign_cohort': {
            $courseId = required_param('course_id', PARAM_INT);
            $cohortId = required_param('cohort_id', PARAM_INT);
            assert_course_in_company($courseId);

            // Verify cohort exists and belongs to system or company context
            $cohort = $DB->get_record('cohort', ['id' => $cohortId], '*', MUST_EXIST);
            $rootCatId = get_company_root_cat();
            $catContext = \context_coursecat::instance($rootCatId);
            $sysContext = \context_system::instance();
            
            if ($cohort->contextid != $catContext->id && $cohort->contextid != $sysContext->id) {
                throw new \moodle_exception(
                    'nopermissions',
                    'error',
                    '',
                    null,
                    'Cohort does not belong to your company'
                );
            }

            // Check if enrolment already exists.
            $existing = $DB->get_record('enrol', [
                'courseid'   => $courseId,
                'enrol'      => 'cohort',
                'customint1' => $cohortId,
            ]);
            if (!$existing) {
                $enrolPlugin = enrol_get_plugin('cohort');
                if (!$enrolPlugin) {
                    throw new \moodle_exception(
                        'error',
                        'local_arina_prism_sense',
                        '',
                        null,
                        'Cohort enrolment plugin not enabled.'
                    );
                }
                $course = $DB->get_record('course', ['id' => $courseId], '*', MUST_EXIST);
                $enrolPlugin->add_instance($course, [
                    'customint1' => $cohortId,
                    'roleid'     => $DB->get_field('role', 'id', ['shortname' => 'student']),
                    'status'     => ENROL_INSTANCE_ENABLED,
                ]);
            }

            echo json_encode(['success' => true]);
            break;
        }

        // ── UNASSIGN: Cohort from Subject ──────────────────────────────────────
        case 'unassign_cohort': {
            $courseId = required_param('course_id', PARAM_INT);
            $cohortId = required_param('cohort_id', PARAM_INT);
            assert_course_in_company($courseId);

            $instance = $DB->get_record('enrol', [
                'courseid'   => $courseId,
                'enrol'      => 'cohort',
                'customint1' => $cohortId,
            ]);
            if ($instance) {
                $enrolPlugin = enrol_get_plugin('cohort');
                $enrolPlugin->delete_instance($instance);
            }

            echo json_encode(['success' => true]);
            break;
        }

        // ── WRITE: Rename a course section ───────────────────────────────────────────
        case 'rename_section': {
            $courseId   = required_param('course_id', PARAM_INT);
            $sectionId  = required_param('section_id', PARAM_INT);
            $sectionName = required_param('name', PARAM_TEXT);

            $course = $DB->get_record('course', ['id' => $courseId], '*', MUST_EXIST);
            assert_category_in_company((int) $course->category);

            $DB->set_field(
                'course_sections',
                'name',
                $sectionName,
                ['id' => $sectionId, 'course' => $courseId]
            );

            echo json_encode(['success' => true, 'name' => $sectionName]);
            break;
        }

        // ── READ: Curriculum sections for a subject (course) ────────────────────────
        case 'get_subject_sections': {
            $courseId = required_param('course_id', PARAM_INT);

            $course = $DB->get_record('course', ['id' => $courseId], '*', MUST_EXIST);
            assert_category_in_company((int) $course->category);

            // Fetch all non-general sections (section > 0) for this course.
            $sections = $DB->get_records_select(
                'course_sections',
                'course = ? AND section > 0',
                [$courseId],
                'section ASC'
            );

            $result = [];
            foreach ($sections as $section) {
                // Look for a label named exactly ‘Curriculum’ in this section.
                $label = $DB->get_record_sql(
                    "SELECT l.id, l.intro, cm.id AS cmid
                       FROM {label} l
                       JOIN {course_modules} cm ON cm.instance = l.id
                       JOIN {modules} m ON m.id = cm.module AND m.name = 'label'
                      WHERE l.course = ? AND l.name = 'Curriculum'
                        AND cm.section = ? AND cm.deletioninprogress = 0",
                    [$courseId, $section->id]
                );

                $result[] = [
                    'sectionId'      => (int) $section->id,
                    'sectionNumber'  => (int) $section->section,
                    'name'           => !empty($section->name)
                                            ? $section->name
                                            : ('Topic ' . $section->section),
                    'hasCurriculum'  => !empty($label),
                    'curriculumText' => !empty($label) ? $label->intro : '',
                ];
            }

            echo json_encode(['success' => true, 'data' => $result]);
            break;
        }

        // ── WRITE: Create or update curriculum label in a section ────────────────
        case 'save_curriculum': {
            $courseId       = required_param('course_id', PARAM_INT);
            $curriculumText = required_param('curriculum_text', PARAM_CLEANHTML);
            $sectionId      = optional_param('section_id', 0, PARAM_INT);
            $sectionName    = optional_param('section_name', '', PARAM_TEXT);

            $course = $DB->get_record('course', ['id' => $courseId], '*', MUST_EXIST);
            assert_category_in_company((int) $course->category);

            // If no section_id, create the next section in the course.
            if (!$sectionId) {
                $maxSection = (int) ($DB->get_field_sql(
                    'SELECT COALESCE(MAX(section), 0) FROM {course_sections} WHERE course = ?',
                    [$courseId]
                ));
                $newSectionNum = $maxSection + 1;
                course_create_sections_if_missing($courseId, $newSectionNum);
                $sectionId = (int) $DB->get_field(
                    'course_sections',
                    'id',
                    ['course' => $courseId, 'section' => $newSectionNum]
                );
            }

            // Rename the section if a custom name was supplied.
            if (!empty($sectionName)) {
                $DB->set_field(
                    'course_sections',
                    'name',
                    $sectionName,
                    ['id' => $sectionId, 'course' => $courseId]
                );
            }

            // $curriculumText is already sanitised HTML (PARAM_CLEANHTML above).
            $introHtml = $curriculumText;

            // Check for an existing Curriculum label in this section.
            $existing = $DB->get_record_sql(
                "SELECT l.id, cm.id AS cmid
                   FROM {label} l
                   JOIN {course_modules} cm ON cm.instance = l.id
                   JOIN {modules} m ON m.id = cm.module AND m.name = 'label'
                  WHERE l.course = ? AND l.name = 'Curriculum'
                    AND cm.section = ? AND cm.deletioninprogress = 0",
                [$courseId, $sectionId]
            );

            if ($existing) {
                $DB->set_field('label', 'intro', $introHtml, ['id' => $existing->id]);
                echo json_encode([
                    'success'   => true,
                    'action'    => 'updated',
                    'sectionId' => $sectionId,
                    'cmid'      => (int) $existing->cmid,
                ]);
            } else {
                $sectionRecord = $DB->get_record(
                    'course_sections',
                    ['id' => $sectionId, 'course' => $courseId],
                    '*',
                    MUST_EXIST
                );

                $moduleData              = new stdClass();
                $moduleData->course      = $courseId;
                $moduleData->section     = (int) $sectionRecord->section;
                $moduleData->modulename  = 'label';
                $moduleData->name        = 'Curriculum';
                $moduleData->intro       = $introHtml;
                $moduleData->introformat = FORMAT_HTML;
                $moduleData->visible     = 1;

                $module = $DB->get_record('modules', ['name' => 'label'], '*', MUST_EXIST);
                $moduleData->module = $module->id;
                $moduleData->add    = 'label';

                $addedMod = add_moduleinfo($moduleData, $course);
                echo json_encode([
                    'success'   => true,
                    'action'    => 'created',
                    'sectionId' => $sectionId,
                    'cmid'      => (int) $addedMod->coursemodule,
                ]);
            }
            break;
        }

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Unknown action: {$action}"]);
            break;
    }

} catch (\required_capability_exception $e) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied.']);
} catch (\invalid_parameter_exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error'   => $e->getMessage(),
    ]);
}
