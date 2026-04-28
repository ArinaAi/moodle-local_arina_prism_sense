<?php

/**
 * Delete generated content from database (preserves Azure files for restore)
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');

$contentid = required_param('contentid', PARAM_INT);
require_login();

header('Content-Type: application/json');

try {
    // Get the content record
    $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has permission to delete this content
    $context = context_course::instance($content->courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);
    require_sesskey();


    // Store Azure folder info before deletion (for logging/restore purposes)
    $generationData = json_decode($content->generationdata, true);
    $azureInfo = [
        'contentid' => $contentid,
        'courseid' => $content->courseid,
        'sectionid' => $content->sectionid,
        'timecreated' => $content->timecreated,
        'contenttype' => $content->contenttype,
        'deleted_at' => time(),
        'deleted_by' => $USER->id,
    ];

    error_log('ArinaPrismSense: Deleting content ' . $contentid);
    error_log('ArinaPrismSense: Azure restoration info: ' . json_encode($azureInfo));

    // Delete from database only (Azure files remain for restore)
    $deleted = $DB->delete_records('local_arina_prism_sense_content', ['id' => $contentid]);

    if ($deleted) {
        // Optionally: Store deletion info in a separate restoration table
        // This would allow tracking what was deleted and when
        // $DB->insert_record('local_arina_prism_sense_deleted', $azureInfo);

        echo json_encode([
            'status' => 'success',
            'message' => 'Content deleted successfully!',
            'contentid' => $contentid,
            'azure_preserved' => true,
        ]);
    }
} catch (Exception $e) {
    error_log('ArinaPrismSense delete_content error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
    ]);
}
