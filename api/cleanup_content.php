<?php
/**
 * Cleanup script - deletes all content from database
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
    $courseid = required_param('courseid', PARAM_INT);
    require_login($courseid, false);
    require_capability(LECTUREBOT_CAPABILITY_GENERATE_CONTENT, context_course::instance($courseid));
    require_sesskey();


    // Delete all content for this course
    $DB->delete_records('local_lecturebot_content', ['courseid' => $courseid]);

    echo json_encode([
        'success' => true,
        'message' => 'All content cleared successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
