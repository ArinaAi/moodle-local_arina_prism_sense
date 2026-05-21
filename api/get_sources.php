<?php

/**
 * API endpoint to get all source PDFs for a course, grouped by section
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
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
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

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

    $sources = $DB->get_records('local_arina_prism_sense_sources', $params, 'sectionid, timecreated');

    // Pre-fetch which fileitemids actually exist in mdl_files.
    // Backup-restored sources may have a source DB record but no corresponding file —
    // emitting a view URL for them would cause a 404 in view_pdf.php.
    $allItemids = array_column((array) $sources, 'fileitemid');
    $existingItemids = [];
    if (!empty($allItemids)) {
        [$inSql, $inParams] = $DB->get_in_or_equal($allItemids, SQL_PARAMS_QM);
        $existingItemids = array_flip(array_column(
            $DB->get_records_select(
                'files',
                "component = 'local_arina_prism_sense' AND filearea = 'sources' AND filename != '.' AND itemid $inSql",
                $inParams,
                '',
                'itemid'
            ),
            'itemid'
        ));
    }

    // Build result rows — shared logic for both section-scoped and course-wide requests.
    // The flat (course-wide) format adds sectionid/sectionname for the LeftColumn view.
    $result = [];
    foreach ($sources as $source) {
        $hasFile  = isset($existingItemids[$source->fileitemid]);
        $view_url = $hasFile
            ? (new moodle_url('/local/arina_prism_sense/view_pdf.php', ['id' => $source->id]))->out(false)
            : null;

        $row = [
            'id'                => $source->id,
            'filename'          => $source->filename,
            'filesize'          => $source->filesize,
            'title'             => $source->title,
            'author'            => $source->author,
            'fileitemid'        => $source->fileitemid,
            'upload_id'         => $source->upload_id ?? null,
            'view_url'          => $view_url,
            'is_scanned'        => isset($source->is_scanned) ? (int) $source->is_scanned : null,
            'processing_status' => isset($source->processing_status) ? $source->processing_status : 'uploaded',
            'timecreated'       => $source->timecreated,
        ];

        if ($sectionid === null) {
            $row['sectionid']   = $source->sectionid;
            $row['sectionname'] = $section_names[$source->sectionid] ?? 'Unknown Section';
        }

        $result[] = $row;
    }

    echo json_encode(['success' => true, 'sources' => $result]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
