<?php
/**
 * Generate content proxy - Updated for new flow with database tracking
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');
require_once(__DIR__ . '/../configurator_azure.php');
require_once(__DIR__ . '/../lib_azure_storage.php');

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid, false);
require_sesskey();

$context = context_course::instance($courseid);
require_capability('moodle/course:update', $context);

// Set PAGE context to avoid debugging warnings
$PAGE->set_context($context);

// CRITICAL: Close session immediately after authentication to prevent blocking other requests
// This allows users to preview/approve other content while generation is in progress
session_write_close();

header('Content-Type: application/json');

// Validate API key early — before queuing any task.
// get_config() reads from the database in a fresh web-request context, so this
// bypasses any stale in-process cache that a long-running cron process might hold.
$apiKey = get_config('local_lecturebot', 'api_key');
if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error'  => 'API key is not configured. Please add your API key in the plugin settings.'
    ]);
    exit;
}

// Enable high memory limit for any lightweight overhead
ini_set('memory_limit', '512M');

// Disable error display to prevent HTML in JSON response (errors go to log)
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
ini_set('html_errors', '0');
// Safety: Hide arguments in stack traces to prevent sensitive data leakage
ini_set('zend.exception_ignore_args', '1');

try {
    // Get POST data
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);

    if (!$input || !is_array($input)) {
        error_log('LectureBot: Invalid request - input is empty or not an array');
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'Invalid request data - no JSON received or malformed JSON'
        ]);
        exit;
    }

    // Validate required fields
    if (!isset($input['section_id'])) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'Missing required field: section_id'
        ]);
        exit;
    }

    $sectionid = $input['section_id'];
    $contentStrategy = $input['content_strategy'] ?? 'standard';
    $videoLength = isset($input['video_length']) ? (int)$input['video_length'] : LECTUREBOT_DEFAULT_VIDEO_LENGTH;
    $language = $input['language'] ?? 'english';
    $voiceGender = $input['voice_gender'] ?? 'female';
    $avatarStrategy = $input['avatar_strategy'] ?? 'title_only';
    $avatarVideoNeeded = $input['avtar_video_needed'] ?? 'no';
    
    // Determine content type
    $contentType = ($avatarVideoNeeded === 'yes') ? 'video' : 'slide-deck';

    // Fetch curriculum directly from the section's Page activity
    require_once($CFG->libdir . '/modinfolib.php');
    
    $modinfo = get_fast_modinfo($courseid);
    
    // Find the section
    $sectioninfo = null;
    foreach ($modinfo->get_section_info_all() as $section) {
        if ($section->id == $sectionid) {
            $sectioninfo = $section;
            break;
        }
    }
    
    if (!$sectioninfo) {
        throw new \local_lecturebot\exception\section_not_found_exception('Section not found');
    }
    
    // Check if source_content_id is provided (to use specific slide deck's text)
    $sourceContentId = isset($input['source_content_id']) ? (int)$input['source_content_id'] : 0;
    
    // Check for regeneration feedback
    $parentContentId = isset($input['parent_content_id']) ? (int)$input['parent_content_id'] : 0;
    $feedbackId = isset($input['feedback_id']) ? (int)$input['feedback_id'] : 0;
    $feedbackData = null;

    if ($feedbackId > 0) {
        $feedbackData = $DB->get_record('local_lecturebot_feedback', ['id' => $feedbackId]);
        if ($feedbackData && $parentContentId === 0) {
            $parentContentId = $feedbackData->contentid;
        }
    }

    $curriculumText = '';
    $sourceRegenCount = null;

    if ($sourceContentId > 0 || $parentContentId > 0) {
        $idToUse = $sourceContentId > 0 ? $sourceContentId : $parentContentId;
        $sourceContent = $DB->get_record('local_lecturebot_content', ['id' => $idToUse]);
        if ($sourceContent && !empty($sourceContent->generationdata)) {
            $genData = json_decode($sourceContent->generationdata, true);
            if (isset($genData['curriculum_text'])) {
                $curriculumText = $genData['curriculum_text'];
                error_log("LectureBot: Using curriculum text from content ID: $idToUse");
            }
            if (isset($genData['regen_count'])) {
                $sourceRegenCount = $genData['regen_count'];
            }
        }
    }

    // If no source content or text not found, fetch live from section
    if (empty($curriculumText)) {
        // Only read the activity named exactly "Curriculum" (case-insensitive).
        // This can be either a Text and Media Area (label) or a Page activity.
        $cms = $sectioninfo->modinfo->get_cms();

        foreach ($cms as $cm) {
            // Must be in this section and named "Curriculum"
            if ($cm->sectionnum != $sectioninfo->section) {
                continue;
            }
            if (strcasecmp(trim($cm->name), 'Curriculum') !== 0) {
                continue;
            }

            if ($cm->modname == 'label') {
                $label = $DB->get_record('label', ['id' => $cm->instance]);
                if ($label && !empty($label->intro)) {
                    $curriculumText = trim(strip_tags($label->intro));
                    error_log("LectureBot: Found 'Curriculum' label (id:{$cm->id}) in section $sectionid");
                    break;
                }
            } elseif ($cm->modname == 'page') {
                $page = $DB->get_record('page', ['id' => $cm->instance]);
                if ($page && !empty($page->content)) {
                    $curriculumText = trim(strip_tags($page->content));
                    error_log("LectureBot: Found 'Curriculum' page (id:{$cm->id}) in section $sectionid");
                    break;
                }
            }
        }
    }

    // If still empty, throw error with actionable instructions
    if (empty($curriculumText)) {
        throw new \local_lecturebot\exception\curriculum_not_found_exception(
            'No "Curriculum" activity found in this section. ' .
            'Please add a Text and Media Area (or Page) titled exactly "Curriculum" ' .
            'under this section in the course, then try again.'
        );
    }

    error_log('LectureBot: Curriculum text length: ' . strlen($curriculumText) . ' characters');

    // Get section name for title (use simple string to avoid formatting issues)
    $sectionName = !empty($sectioninfo->name) ? strip_tags($sectioninfo->name) : "Section {$sectioninfo->section}";

    // Get source PDFs for this section
    $sources = $DB->get_records('local_lecturebot_sources', [
        'courseid' => $courseid,
        'sectionid' => $sectionid
    ]);

    if (empty($sources)) {
        throw new \local_lecturebot\exception\source_not_found_exception('No source PDFs found for this section');
    }

    // Note: The new API (http://0.0.0.0:8034/generate_pptx) doesn't require PDF upload
    // It generates slides based on curriculum text directly
    
    // Get tenant ID from config or fallback to 1
    // The API requires an integer for organization_id
    $tenantConfig = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
    $tenantId = is_numeric($tenantConfig) ? (int)$tenantConfig : 1;
    
    // Log warning if tenant ID was a string so admin knows to fix it
    if (!is_numeric($tenantConfig)) {
        error_log("LectureBot: LECTUREBOT_TENANT_ID ('$tenantConfig') is not numeric. " .
                  "falling back to 1 for organization_id.");
    }

    // Calculate regen_count by querying Azure directly (Source of Truth)
    // This ensures we continue the sequence (0, 1, 2...) even if Moodle records are deleted
    // Determine regen_count (Azure folder index)
    // Priority:
    // 1. Explicit regen_count from request (if provided)
    // 2. regen_count from source content (if source_content_id provided)
    // 3. Calculate next available index from Azure
    $regenCount = null;
    
    if (isset($input['regen_count']) && is_numeric($input['regen_count'])) {
        $regenCount = (int)$input['regen_count'];
        error_log("LectureBot: Using explicit regen_count $regenCount from request");
    } elseif (!empty($sourceRegenCount)) {
        $regenCount = $sourceRegenCount;
        error_log("LectureBot: Reusing regen_count $regenCount from source content ID $sourceContentId");
    } else {
        $regenCount = get_azure_regen_count($courseid, $sectionid);
        error_log("LectureBot: Calculated regen_count $regenCount from Azure");
    }

    // Enforce logic to start from 0 if no records found
    if ($regenCount < 0) {
        $regenCount = 0;
    }

    // Check for explicit content_type from input
    // This allows forcing 'video' even if avatar is not needed
    if (isset($input['content_type']) && $input['content_type'] === 'video') {
        $contentType = 'video';
    }

    // Create database entry with status='generating'
    $content = new stdClass();
    $content->courseid = $courseid;
    $content->sectionid = $sectionid;
    $content->contenttype = $contentType;
    $content->status = 'generating';
    $content->title = ($contentType === 'video' ? 'Video: ' : 'Slides: ') . $sectionName;
    $content->parent_content_id = $parentContentId > 0 ? $parentContentId : null;
    $content->feedback_id = $feedbackId > 0 ? $feedbackId : null;
    
    // Prepare feedback for AI backend
    $feedbackDetails = null;
    if ($feedbackData) {
        $feedbackDetails = [
            'type' => $feedbackData->feedback_type,
            'selected_categories' => json_decode($feedbackData->selected_categories),
            'topics_needing_depth' => json_decode($feedbackData->topics_needing_depth),
            'topics_overexplained' => json_decode($feedbackData->topics_overexplained),
            'extra_topics' => json_decode($feedbackData->extra_topics),
            'missing_subtopics' => json_decode($feedbackData->missing_subtopics),
            'reordered_flow' => json_decode($feedbackData->reordered_flow),
            'comments' => $feedbackData->comments
        ];
    }

    $content->generationdata = json_encode([
        'curriculum_text' => $curriculumText,
        'content_strategy' => $contentStrategy,
        'video_length' => $videoLength,
        'language' => $language,
        'voice_gender' => $voiceGender,
        'avatar_strategy' => $avatarStrategy,
        'avtar_video_needed' => $avatarVideoNeeded,
        'content_type' => $contentType,
        'requested_at' => time(),
        'regen_count' => $regenCount,
        'feedback' => $feedbackDetails
    ]);
    $content->createdby = $USER->id;
    $content->timecreated = time();
    $content->timemodified = time();

    $contentId = $DB->insert_record('local_lecturebot_content', $content);
    
    // ==========================================
    // NEW: Queue Adhoc Task
    // ==========================================
    // Create Adhoc Task (Real or Mock based on config)
    $task_data = [
        'content_id' => $contentId,
        'curriculum_text' => $curriculumText,
        'tenant_id' => $tenantId,
        'course_id' => $courseid,
        'section_id' => $sectionid,
        'regen_count' => $regenCount,
        'video_length' => $videoLength,
        'content_strategy' => $contentStrategy,
        'language' => $language,
        'voice_gender' => $voiceGender,
        'avatar_strategy' => $avatarStrategy,
        'avtar_video_needed' => $avatarVideoNeeded,
        'content_type' => $contentType,
        'feedback' => $feedbackDetails,
        'parent_content_id' => $parentContentId,
        'user_id' => $USER->id  // Pass Moodle user ID for UUID lookup in task
    ];

    if (defined('DEVELOPER_MODE') && DEVELOPER_MODE) {
        $task = new \local_lecturebot\task\generate_content_task_mock();
        $task->set_custom_data($task_data);
        
        // DEVELOPER MODE: EXECUTE SYNCHRONOUSLY
        // Bypassing Adhoc Queue to avoid Cron dependencies in local dev
        error_log("LectureBot: [DEV] Executing mock task synchronously for content $contentId");
        $task->execute();
        
    } else {
        $task = new \local_lecturebot\task\generate_content_task();
        $task->set_custom_data($task_data);
        
        // PRODUCTION: Queue the task
        \core\task\manager::queue_adhoc_task($task);
        error_log("LectureBot: Queued generation task for content $contentId");
    }
    
    error_log("LectureBot: Queued generation task for content $contentId");

    // Return success immediately
    echo json_encode([
        'status' => 'success',
        'content_id' => $contentId,
        'message' => 'Generation queued successfully',
        'is_queued' => true
    ]);
    
} catch (Exception $e) {
    error_log('LectureBot: Exception caught: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}