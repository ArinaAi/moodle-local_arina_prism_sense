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

// Process any pending updates (mock async completion)
$temp_dir = $CFG->dataroot . '/temp';
error_log('CHECK_STATUS: Checking temp dir: ' . $temp_dir);

if (is_dir($temp_dir)) {
    $files = glob($temp_dir . '/lecturebot_pending_*.json');
    error_log('CHECK_STATUS: Found ' . count($files) . ' pending files');
    
    foreach ($files as $file) {
        error_log('CHECK_STATUS: Processing file: ' . basename($file));
        $data = json_decode(file_get_contents($file), true);
        
        if ($data && isset($data['update_time'])) {
            error_log('CHECK_STATUS: File update_time: ' . $data['update_time'] .
                ', Current time: ' . time() .
                ', Diff: ' . (time() - $data['update_time']));
            
            if (time() >= $data['update_time']) {
                // Time to update - mark as ready
                $content_id = $data['content_id'];
                error_log('CHECK_STATUS: Time to update content_id: ' . $content_id);
                
                // Get current record
                $current = $DB->get_record('local_lecturebot_content', ['id' => $content_id]);
                if ($current) {
                    error_log('CHECK_STATUS: Current status: ' . $current->status);
                    
                    if ($current->status === 'generating') {
                        // Update to ready
                        $current->status = 'ready';
                        $current->timemodified = time();
                        $current->generationdata = $data['update_record']['generationdata'];
                        $DB->update_record('local_lecturebot_content', $current);
                        error_log('CHECK_STATUS: ✅ Updated to ready!');
                    } else {
                        error_log('CHECK_STATUS: ⚠️ Status is not generating, skipping');
                    }
                } else {
                    error_log('CHECK_STATUS: ❌ Content record not found!');
                }
                
                // Delete the pending file
                unlink($file);
                error_log('CHECK_STATUS: Deleted pending file');
            } else {
                error_log('CHECK_STATUS: Not ready yet, waiting...');
            }
        }
    }
} else {
    error_log('CHECK_STATUS: ❌ Temp directory does not exist!');
}

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = optional_param('contentid', 0, PARAM_INT);
    
    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);
    
    // Release session lock to prevent blocking other requests during long polls
    \core\session\manager::write_close();
    
    if ($contentid) {
        // Get specific content item
        $content = $DB->get_record('local_lecturebot_content', [
            'id' => $contentid,
            'courseid' => $courseid
        ]);
        
        if (!$content) {
            throw new moodle_exception('Content not found');
        }
        
        // Parse generation data
        $generationData = json_decode($content->generationdata, true);
        
        echo json_encode([
            'status' => 'success',
            'content' => [
                'id' => $content->id,
                'sectionid' => $content->sectionid,
                'contenttype' => $content->contenttype,
                'status' => $content->status,
                'title' => $content->title,
                'errormessage' => $content->errormessage,
                'timecreated' => $content->timecreated,
                'timemodified' => $content->timemodified,
                'result' => $generationData['result'] ?? null
            ]
        ]);
    } else {
        // Get all content items for course
        error_log('CHECK_STATUS: Querying all content for course ' . $courseid);
        $contents = $DB->get_records('local_lecturebot_content', [
            'courseid' => $courseid
        ], 'timemodified DESC');
        
        error_log('CHECK_STATUS: Found ' . count($contents) . ' content records');
        
        // Get section names
        $modinfo = get_fast_modinfo($courseid);
        $sections = $modinfo->get_section_info_all();
        $section_names = [];
        foreach ($sections as $section) {
            $section_names[$section->id] = $section->name ?: "Section " . $section->section;
        }
        
        $contentList = [];
        foreach ($contents as $content) {
            $generationData = json_decode($content->generationdata, true);
            
            error_log('CHECK_STATUS: Content ' . $content->id . ' - status: ' . $content->status);
            
            $contentList[] = [
                'id' => $content->id,
                'sectionid' => $content->sectionid,
                'sectionname' => $section_names[$content->sectionid] ?? "Unknown Section",
                'contenttype' => $content->contenttype,
                'status' => $content->status,
                'title' => $content->title,
                'errormessage' => $content->errormessage,
                'timecreated' => $content->timecreated,
                'timemodified' => $content->timemodified,
                'timepublished' => $content->timepublished,
                'cmid' => $content->cmid,
                'result' => $generationData['result'] ?? null
            ];
        }
        
        error_log('CHECK_STATUS: Returning ' . count($contentList) . ' items');
        
        echo json_encode([
            'status' => 'success',
            'contents' => $contentList
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
