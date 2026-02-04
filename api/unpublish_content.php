<?php
/**
 * Unpublish content - changes status from 'published' back to 'ready'
 *
 * This endpoint reverts content to ready status for re-editing or re-publishing.
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

// Get POST data
try {
    $input = \local_lecturebot\Utils::getJsonInput();
    $courseid = $input['courseid'] ?? 0;
    $contentid = $input['contentid'] ?? 0;

    $content_record = \local_lecturebot\Utils::validateCourseContentRequest($courseid, $contentid);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

try {
    
    // Check if currently published
    if ($content_record->status !== 'published') {
        http_response_code(400);
        echo json_encode(['error' => 'Content is not currently published']);
        exit;
    }
    
    // Delete tracking records for this content
    $DB->delete_records('local_lecturebot_tracking', ['contentid' => $contentid]);
    
    // Update status back to ready
    $update_record = new stdClass();
    $update_record->id = $contentid;
    $update_record->status = 'ready';
    $update_record->timepublished = null;
    $update_record->cmid = null;
    $update_record->timemodified = time();
    
    $DB->update_record('local_lecturebot_content', $update_record);
    
    echo json_encode([
        'success' => true,
        'message' => 'Content unpublished successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to unpublish content: ' . $e->getMessage()
    ]);
}
