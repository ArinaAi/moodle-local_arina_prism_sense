<?php
/**
 * Approve content API endpoint
 * Marks content as approved and records who approved it and when
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
    $contentid = required_param('contentid', PARAM_INT);
    $courseid = required_param('courseid', PARAM_INT);
    
    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    if (!has_capability('local/lecturebot:approvecontent', $context)) {
        throw new moodle_exception('error', 'moodle', '', 'You do not have permission to approve content.');
    }
    require_sesskey();

    
    // Release session lock
    \core\session\manager::write_close();
    
    // Get the content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid, 'courseid' => $courseid]);
    
    if (!$content) {
        throw new moodle_exception('error', 'moodle', '', 'Content not found');
    }
    
    // Check if content is in a state that can be approved
    if ($content->status !== 'ready') {
        throw new moodle_exception('error', 'moodle', '', 'Content must be in ready state to be approved');
    }
    
    // Update the content with approval information
    $content->approved = 1;
    $content->approvedby = $USER->id;
    $content->timeapproved = time();
    $content->timemodified = time();
    
    $DB->update_record('local_lecturebot_content', $content);
    
    // Get approver information
    $approver = $DB->get_record('user', ['id' => $USER->id], 'id, firstname, lastname, email');
    
    echo json_encode([
        'success' => true,
        'message' => 'Content approved successfully',
        'approved' => true,
        'approvedby' => $content->approvedby,
        'timeapproved' => $content->timeapproved,
        'approver' => [
            'id' => $approver->id,
            'firstname' => $approver->firstname,
            'lastname' => $approver->lastname,
            'fullname' => fullname($approver),
            'email' => $approver->email
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
