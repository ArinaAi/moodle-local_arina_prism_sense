<?php
/**
 * API endpoint to get all course content for the student interface
 * Aggregates visible sections, published content, and user completion status
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
    
    // Get the course object
    $course = get_course($courseid);
    
    // Require basic login first (without course context to avoid role-switch issues)
    require_login(null, false);
    
    // Now check course access using can_access_course which handles role-switching properly
    $context = context_course::instance($courseid);
    
    // can_access_course checks if the user can access this course
    // It considers: enrollment, guest access, admin access, etc.
    if (!can_access_course($course)) {
        throw new moodle_exception('noaccess', 'local_lecturebot');
    }
    
    $userid = $USER->id;
    
    // 1. Get Course Sections
    $modinfo = get_fast_modinfo($courseid);
    $sections = $modinfo->get_section_info_all();
    
    // 2. Get Generated Content (Published Only)
    // We only show published content to students
    $generatedContent = $DB->get_records('local_lecturebot_content', [
        'courseid' => $courseid,
        'status' => 'published'
    ]);
    
    // 3. Get Completion Tracking for this user
    // Fetch all completion records for this user in this course
    $trackingRecords = $DB->get_records('local_lecturebot_tracking', [
        'userid' => $userid,
        'courseid' => $courseid
    ], '', 'contentid, status');
    
    // 4. Build Response Structure
    $responseSections = [];
    $hasContent = false;
    
    foreach ($sections as $section) {
        if ($section->uservisible) {
            $sectionId = $section->id;
            $items = [];
            
            // Filter content for this section
            foreach ($generatedContent as $content) {
                if ($content->sectionid == $sectionId) {
                    $hasContent = true;
                    
                    // Determine Type
                    // Map database types to frontend types: 'slide', 'video', 'flashcard', 'mindmap'
                    $type = 'slide'; // Default
                    if ($content->contenttype === 'video') {
                        $type = 'video';
                    }
                    // Add other mappings as needed
                    
                    // Parse Generation Data for Metadata
                    $genData = json_decode($content->generationdata, true);
                    
                    // Duration Logic
                    $duration = '5 min';
                    $slideCount = 0;
                    
                    if (isset($genData['slide_count'])) {
                        $slideCount = (int)$genData['slide_count'];
                        $duration = $slideCount . ' min'; // Rough estimate
                    } elseif (isset($genData['video_length'])) {
                        $duration = $genData['video_length'] . ' min';
                    } elseif (isset($genData['video_size'])) {
                         // Estimate video duration from size? Or just use "Video"
                         $duration = "Start";
                    }
                    
                    // Completion Status
                    // Check if contentid exists in tracking records and status is 1
                    $isCompleted = false;
                    $progress = 0;
                    
                    if (isset($trackingRecords[$content->id]) && $trackingRecords[$content->id]->status == 1) {
                        $isCompleted = true;
                        $progress = 100;
                    }

                    $items[] = [
                        'id' => (int)$content->id,
                        'title' => $content->title ?: 'Untitled Content',
                        'type' => $type,
                        'duration' => $duration,
                        'isCompleted' => $isCompleted,
                        'progress' => $progress, // Tracking partial progress can be added later
                        'totalSlides' => $slideCount
                    ];
                }
            }
            
            // Sort items by ID (creation order) or timepublished
            usort($items, function ($a, $b) {
                return $a['id'] - $b['id'];
            });

            // Include section even if empty, to show course structure
            // Or filter out empty sections if preferred. Let's keep structure.
            $responseSections[] = [
                'id' => (int)$sectionId,
                'title' => $section->name ?: "Section " . $section->section,
                'items' => $items,
                'isExpanded' => false // Frontend to handle defaults
            ];
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'sections' => $responseSections,
        'hasContent' => $hasContent
    ]);
    
} catch (moodle_exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'errorcode' => $e->errorcode ?? 'unknown',
        'debuginfo' => debugging() ? $e->getTraceAsString() : null
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'debuginfo' => debugging() ? $e->getTraceAsString() : null
    ]);
}
