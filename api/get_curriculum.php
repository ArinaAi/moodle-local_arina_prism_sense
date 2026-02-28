<?php
/**
 * API endpoint to fetch curriculum from a section's Page activity
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/modinfolib.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $sectionid = required_param('sectionid', PARAM_INT);
    
    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);
    
    // Get course module info
    $modinfo = get_fast_modinfo($courseid);
    
    // Find the section
    $sectioninfo = null;
    foreach ($modinfo->get_section_info_all() as $section) {
        if ($section->id == $sectionid) {
            $sectioninfo = $section;
            break;
        }
    }
    
    if (!$sectioninfo) {
        throw new moodle_exception('Section not found');
    }
    
    // Only read a Text and Media Area (label) whose title is exactly "Curriculum"
    // (case-insensitive). Pages and the section summary are intentionally ignored.
    $curriculumContent = '';

    if (!empty($sectioninfo->sequence)) {
        $cmids = explode(',', $sectioninfo->sequence);

        foreach ($cmids as $cmid) {
            $cm = $modinfo->get_cm($cmid);

            // Must be a label AND named "Curriculum"
            if ($cm->modname !== 'label' || !$cm->uservisible) {
                continue;
            }
            if (strcasecmp(trim($cm->name), 'Curriculum') !== 0) {
                continue;
            }

            $label = $DB->get_record('label', ['id' => $cm->instance]);
            if ($label && !empty($label->intro)) {
                $curriculumContent = trim(strip_tags($label->intro));
                break;
            }
        }
    }

    // Return the curriculum (empty string if not found — frontend handles the message)
    echo json_encode([
        'status'     => 'success',
        'curriculum' => $curriculumContent
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}