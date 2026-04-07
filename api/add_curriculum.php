<?php
/**
 * API endpoint to create a "Curriculum" label (Text & Media area) in a section
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');
require_once($CFG->libdir . '/modinfolib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->dirroot . '/mod/label/lib.php');

header('Content-Type: application/json');

try {
    // Only accept POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new moodle_exception('Only POST requests are accepted.');
    }

    // Parse JSON body
    $rawBody = file_get_contents('php://input');
    $body    = json_decode($rawBody, true);

    $courseid       = isset($body['courseid'])        ? (int) $body['courseid']        : 0;
    $sectionid      = isset($body['sectionid'])       ? (int) $body['sectionid']       : 0;
    $curriculumText = isset($body['curriculum_text']) ? trim($body['curriculum_text']) : '';

    if (!$courseid || !$sectionid) {
        throw new moodle_exception('courseid and sectionid are required.');
    }
    if ($curriculumText === '') {
        throw new moodle_exception('curriculum_text cannot be empty.');
    }

    // Auth
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

    // Resolve section number from section id
    $sectionRecord = $DB->get_record('course_sections', ['id' => $sectionid, 'course' => $courseid], '*', MUST_EXIST);
    $sectionNumber = (int) $sectionRecord->section;

    // Build the label intro content (wrap plain text in <p> tags, preserving newlines)
    $introHtml = '<p>' . nl2br(htmlspecialchars($curriculumText, ENT_QUOTES)) . '</p>';

    // Build the module data object
    $moduleData                 = new stdClass();
    $moduleData->course         = $courseid;
    $moduleData->section        = $sectionNumber;
    $moduleData->modulename     = 'label';
    $moduleData->name           = 'Curriculum';
    $moduleData->intro          = $introHtml;
    $moduleData->introformat    = FORMAT_HTML;
    $moduleData->visible        = 1;

    // add_moduleinfo requires a course record and module entry
    $course = $DB->get_record('course', ['id' => $courseid], '*', MUST_EXIST);
    $module = $DB->get_record('modules', ['name' => 'label'], '*', MUST_EXIST);

    $moduleData->module = $module->id;
    $moduleData->add    = 'label';

    // Use core add_moduleinfo
    $addedMod = add_moduleinfo($moduleData, $course);

    echo json_encode([
        'status'  => 'success',
        'message' => 'Curriculum added successfully.',
        'cmid'    => $addedMod->coursemodule,
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error'  => $e->getMessage(),
    ]);
}
