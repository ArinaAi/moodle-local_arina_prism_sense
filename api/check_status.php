<?php
/**
 * Check generation status for content items
 * 
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = optional_param('contentid', 0, PARAM_INT);
    $idsParam = optional_param('ids', '', PARAM_RAW); // "1,2,3"

    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);
    
    // Release session lock to prevent blocking
    \core\session\manager::write_close();
    
    $contents = [];

    // Helper to format content
    $formatContent = function ($content) use ($DB, $courseid)
    {
        // Parse generation data
        $generationData = json_decode($content->generationdata, true);
        
        // Get approver information
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
        
       // Get section name helper
       static $section_names = null;
       if ($section_names === null) {
           $modinfo = get_fast_modinfo($courseid);
           $sections = $modinfo->get_section_info_all();
           $section_names = [];
           foreach ($sections as $sec) {
               $section_names[$sec->id] = $sec->name ?: "Section " . $sec->section;
           }
       }

        return [
            'id' => $content->id,
            'sectionid' => $content->sectionid,
            'sectionname' => $section_names[$content->sectionid] ?? "Unknown Section",
            'contenttype' => $content->contenttype,
            'status' => $content->status,
            'title' => $content->title,
            'errormessage' => $content->errormessage,
            'timecreated' => $content->timecreated,
            'timemodified' => $content->timemodified,
            'result' => $generationData['result'] ?? null,
            'approved' => (bool)$content->approved,
            'approvedby' => $content->approvedby,
            'timeapproved' => $content->timeapproved,
            'approver' => $approver,
            // Add video_length for re-use
            'video_length' => $generationData['video_length'] ?? null
        ];
    };

    if ($contentid) {
        // Single ID fetch
        // Single ID fetch
        $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid, 'courseid' => $courseid]);
        if ($content) {
            $contents[] = $content;
        }
    } elseif (!empty($idsParam)) {
        // Targeted Multiple IDs fetch
        $ids = explode(',', $idsParam);
        $cleanIds = [];
        foreach ($ids as $id) {
            if (is_numeric($id)) {$cleanIds[] = (int)$id;}
        }
        
        if (!empty($cleanIds)) {
            list($insql, $inparams) = $DB->get_in_or_equal($cleanIds);
            // Verify courseid too for security
            $sql = "id $insql AND courseid = ?";
            $params = array_merge($inparams, [$courseid]);
            $contents = $DB->get_records_select('local_lecturebot_content', $sql, $params);
        }
    } else {
        // Fetch All (Fallback/Load)
        // Fetch All (Fallback/Load)
        $contents = $DB->get_records('local_lecturebot_content', ['courseid' => $courseid], 'timemodified DESC');
    }

    $contentList = [];
    if ($contents) {
        foreach ($contents as $c) {
            $contentList[] = $formatContent($c);
        }
    }
        
    echo json_encode([
        'status' => 'success',
        'contents' => $contentList
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
