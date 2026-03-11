<?php
/**
 * API endpoint to get all source PDFs for a course, grouped by section
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $sectionid = optional_param('sectionid', null, PARAM_INT);

    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability(LECTUREBOT_CAPABILITY_GENERATE_CONTENT, $context);

    // Get course sections for name lookup
    $modinfo = get_fast_modinfo($courseid);
    $sections = $modinfo->get_section_info_all();

    // Build section name map
    $section_names = [];
    foreach ($sections as $section) {
        $section_names[$section->id] = $section->name ?: "Section " . $section->section;
    }

    // Get sources
    $params = ['courseid' => $courseid];
    if ($sectionid !== null) {
        $params['sectionid'] = $sectionid;
    }

    $sources = $DB->get_records('local_lecturebot_sources', $params, 'sectionid, timecreated');

    // If requesting specific section, return grouped format (for modal)
    if ($sectionid !== null) {
        $result = [];
        foreach ($sources as $source) {
            // Generate secure view URL
            $view_url = new moodle_url('/local/lecturebot/view_pdf.php', ['id' => $source->id]);

            $result[] = [
                'id' => $source->id,
                'filename' => $source->filename,
                'filesize' => $source->filesize,
                'title' => $source->title,
                'author' => $source->author,
                'fileitemid' => $source->fileitemid,
                'view_url' => $view_url->out(false),
                'is_scanned' => isset($source->is_scanned) ? (int) $source->is_scanned : null,
                'processing_status' => isset($source->processing_status) ? $source->processing_status : 'uploaded',
                'timecreated' => $source->timecreated
            ];
        }

        echo json_encode([
            'success' => true,
            'sources' => $result
        ]);
    } else {
        // Return flat array with section info (for LeftColumn)
        $result = [];
        foreach ($sources as $source) {
            // Generate secure view URL
            $view_url = new moodle_url('/local/lecturebot/view_pdf.php', ['id' => $source->id]);

            $result[] = [
                'id' => $source->id,
                'filename' => $source->filename,
                'filesize' => $source->filesize,
                'title' => $source->title,
                'author' => $source->author,
                'fileitemid' => $source->fileitemid,
                'sectionid' => $source->sectionid,
                'sectionname' => $section_names[$source->sectionid] ?? "Unknown Section",
                'view_url' => $view_url->out(false),
                'is_scanned' => isset($source->is_scanned) ? (int) $source->is_scanned : null,
                'processing_status' => isset($source->processing_status) ? $source->processing_status : 'uploaded',
                'timecreated' => $source->timecreated
            ];
        }

        echo json_encode([
            'success' => true,
            'sources' => $result
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
