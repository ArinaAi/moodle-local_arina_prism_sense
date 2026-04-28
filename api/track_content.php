<?php

/**
 * Track content completion status
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $contentid = required_param('contentid', PARAM_INT);
    $status = required_param('status', PARAM_INT); // 1 = complete, 0 = incomplete

    // Get content record to verify courseid
    $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);
    $courseid = $content->courseid;

    // Require login
    require_login($courseid);

    // Release session lock
    \core\session\manager::write_close();

    $userid = $USER->id;
    $now = time();

    // Check if record exists
    $tracking = $DB->get_record('local_arina_prism_sense_tracking', [
        'userid' => $userid,
        'contentid' => $contentid,
    ]);

    if ($tracking) {
        // Update existing record
        $tracking->status = $status;
        $tracking->timemodified = $now;
        $DB->update_record('local_arina_prism_sense_tracking', $tracking);
    } else {
        // Create new record
        $new_tracking = (object)[
            'userid' => $userid,
            'contentid' => $contentid,
            'courseid' => $courseid,
            'status' => $status,
            'timecreated' => $now,
            'timemodified' => $now,
        ];
        $DB->insert_record('local_arina_prism_sense_tracking', $new_tracking);
    }

    echo json_encode([
        'success' => true,
        'status' => $status,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
