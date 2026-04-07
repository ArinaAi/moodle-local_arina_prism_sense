<?php
/**
 * Get all content state from database for a course
 * Returns generating, ready, and published content
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

    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

    // Release session lock to improve concurrency
    \core\session\manager::write_close();

    // Get all content for this course
    $contents = $DB->get_records('local_arina_prism_sense_content', ['courseid' => $courseid], 'timecreated DESC');

    // Get section names
    $modinfo = get_fast_modinfo($courseid);
    $sections = $modinfo->get_section_info_all();
    $section_names = [];
    foreach ($sections as $section) {
        $section_names[$section->id] = $section->name ?: "Section " . $section->section;
    }

    $result = [];
    foreach ($contents as $content) {
        // Self-healing: Check if published content was deleted from course manually
        $generationData = json_decode($content->generationdata, true);

        // Get approver information if content is approved
        $approver = null;
        if ($content->approved && $content->approvedby) {
            $approverUser = $DB->get_record('user', ['id' => $content->approvedby], 'id, firstname, lastname, email');
            if ($approverUser) {
                $approver = [
                    'id' => $approverUser->id,
                    'firstname' => $approverUser->firstname,
                    'lastname' => $approverUser->lastname,
                    'fullname' => fullname($approverUser),
                    'email' => $approverUser->email
                ];
            }
        }

        // If PPTX file exists but no result data, count slides
        if (
            isset($generationData['pptx_path']) &&
            file_exists($generationData['pptx_path']) &&
            empty($generationData['result'])
        ) {

            require_once(__DIR__ . '/generate_content.php');
            $slideCount = countSlidesInPptx($generationData['pptx_path']);

            if ($slideCount > 0) {
                // Create minimal result structure
                $resultsData = [
                    [
                        'topic' => $content->title,
                        'slideCount' => $slideCount
                    ]
                ];

                // Update the generation data
                $generationData['result'] = [
                    'status' => 'success',
                    'results' => $resultsData
                ];
                $generationData['slide_count'] = $slideCount;

                // Update database
                $DB->update_record(
                    'local_arina_prism_sense_content',
                    (object) [
                        'id' => $content->id,
                        'generationdata' => json_encode($generationData),
                        'timemodified' => time()
                    ]
                );
            }
        }



        // Check for student tracking status
        $tracking = $DB->get_record('local_arina_prism_sense_tracking', [
            'userid' => $USER->id,
            'contentid' => $content->id
        ]);
        $isCompleted = $tracking ? (bool) $tracking->status : false;

        $result[] = [
            'id' => $content->id,
            'sectionid' => $content->sectionid,
            'sectionname' => $section_names[$content->sectionid] ?? "Deleted Section",
            'contenttype' => $content->contenttype,
            'status' => $content->status,
            'title' => $content->title,
            'errormessage' => $content->errormessage,
            'timecreated' => $content->timecreated,
            'timemodified' => $content->timemodified,
            'timepublished' => $content->timepublished,
            'timepublished' => $content->timepublished,
            'result' => $generationData['result'] ?? null,
            'generationdata' => $content->generationdata,
            'content_strategy' => $generationData['content_strategy'] ?? 'standard',
            'approved' => (bool) $content->approved,
            'approvedby' => $content->approvedby,
            'timeapproved' => $content->timeapproved,
            'approver' => $approver,
            'video_length' => $generationData['video_length'] ?? null,
            'processing_status' => $generationData['processing_status'] ?? null,
            'isCompleted' => $isCompleted
        ];
    }

    echo json_encode([
        'success' => true,
        'contents' => $result
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
