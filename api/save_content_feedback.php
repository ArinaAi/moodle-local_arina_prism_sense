<?php
/**
 * Save user feedback for generated content
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once __DIR__ . '/../../../config.php';

// User must be logged in
require_login();
require_sesskey();

header('Content-Type: application/json');

try {
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);

    if (!$input || !isset($input['contentid'])) {
        throw new invalid_parameter_exception('Invalid request: Missing content ID');
    }

    $contentid = (int)$input['contentid'];
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has access to this course
    $context = context_course::instance($content->courseid);
    require_capability('moodle/course:update', $context);

    // Prepare feedback record
    $feedback = new stdClass();
    $feedback->contentid = $contentid;
    $feedback->courseid = $content->courseid;
    $feedback->userid = $USER->id;
    $feedback->feedback_type = $input['feedback_type'] ?? 'structured';
    
    // Store JSON data
    $feedback->selected_categories = isset(
        $input['selected_categories']) ?
        json_encode($input['selected_categories']) :
        null;
    $feedback->topics_needing_depth = isset(
        $input['topics_needing_depth']) ?
        json_encode($input['topics_needing_depth']) :
        null;
    $feedback->topics_overexplained = isset(
        $input['topics_overexplained']) ?
        json_encode($input['topics_overexplained']) :
        null;
    $feedback->extra_topics = isset(
        $input['extra_topics']) ?
        json_encode($input['extra_topics']) :
        null;
    $feedback->missing_subtopics = isset(
        $input['missing_subtopics']) ?
        json_encode($input['missing_subtopics']) :
        null;
    $feedback->reordered_flow = isset(
        $input['reordered_flow']) ?
        json_encode($input['reordered_flow']) :
        null;
    
    // Rating/Comments (General feedback)
    $feedback->rating = isset($input['rating']) ? (int)$input['rating'] : null;
    $feedback->comments = isset($input['comments']) ? $input['comments'] : null;
    
    $feedback->timecreated = time();

    $feedbackid = $DB->insert_record('local_lecturebot_feedback', $feedback);

    echo json_encode([
        'success' => true,
        'feedback_id' => $feedbackid,
        'message' => 'Feedback saved successfully'
    ]);

} catch (Exception $e) {
    error_log('LectureBot Feedback Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
