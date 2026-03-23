<?php
/**
 * API endpoint to mark content as complete for the current user
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = required_param('contentid', PARAM_INT);
    $status = optional_param('status', 1, PARAM_INT); // Default to 1 (complete), but allow 0 to unmark
    
    // Require login
    require_login($courseid);
    // Any student enrolled in the course can mark their own progress
    // No specific capability needed other than course access which require_login checks
    
    $userid = $USER->id;
    
    // Check if tracking record exists
    $tracking = $DB->get_record('local_lecturebot_tracking', [
        'userid' => $userid,
        'contentid' => $contentid
    ]);
    
    if ($tracking) {
        // Update existing
        $tracking->status = $status;
        $tracking->timemodified = time();
        $DB->update_record('local_lecturebot_tracking', $tracking);
    } else {
        // Create new
        $new_record = new stdClass();
        $new_record->userid = $userid;
        $new_record->contentid = $contentid;
        $new_record->courseid = $courseid;
        $new_record->status = $status;
        $new_record->timecreated = time();
        $new_record->timemodified = time();
        $DB->insert_record('local_lecturebot_tracking', $new_record);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Progress updated',
        'isCompleted' => ($status == 1)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
