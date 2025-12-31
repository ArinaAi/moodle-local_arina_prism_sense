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
require_once(__DIR__ . '/../config_azure.php');

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
    $avatarVideoNeeded = $input['avtar_video_needed'] ?? 'no'; // Use 'avtar' as per user request variable name
    
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
    $curriculumText = '';

    if ($sourceContentId > 0) {
        $sourceContent = $DB->get_record('local_lecturebot_content', ['id' => $sourceContentId]);
        if ($sourceContent && !empty($sourceContent->generationdata)) {
            $genData = json_decode($sourceContent->generationdata, true);
            if (isset($genData['curriculum_text'])) {
                $curriculumText = $genData['curriculum_text'];
                error_log("LectureBot: Using curriculum text from source content ID: $sourceContentId");
            }
            if (isset($genData['regen_count'])) {
                $sourceRegenCount = $genData['regen_count']; // Capture regen_count from source
            }
        }
    }

    // If no source content or text not found, fetch live from section
    if (empty($curriculumText)) {
        // Get curriculum from first Page activity or Label (text and media area) in the section
        $cms = $sectioninfo->modinfo->get_cms();
        
        foreach ($cms as $cm) {
            // Check if this module is in our section
            if ($cm->sectionnum == $sectioninfo->section) {
                // Check for Page activity
                if ($cm->modname == 'page') {
                    $page = $DB->get_record('page', ['id' => $cm->instance]);
                    if ($page) {
                        $curriculumText = strip_tags($page->content);
                        $curriculumText = trim($curriculumText);
                        break;
                    }
                }else   if ($cm->modname == 'label') {
                    $label = $DB->get_record('label', ['id' => $cm->instance]);
                    if ($label && !empty($label->intro)) {
                        $curriculumText = strip_tags($label->intro);
                        $curriculumText = trim($curriculumText);
                        break;
                    }
                }
            }
        }
        
        // If no page found, check section summary as fallback
        if (empty($curriculumText) && !empty($sectioninfo->summary)) {
            $curriculumText = strip_tags($sectioninfo->summary);
            $curriculumText = trim($curriculumText);
        }
    }
    
    // If still empty, throw error
    if (empty($curriculumText)) {
        throw new \local_lecturebot\exception\curriculum_not_found_exception(
            'No curriculum content found in section. ' .
            'Please add a Page activity or section summary with curriculum content.'
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
        $regenCount = get_azure_regen_count($courseid, $sectionid, $tenantId);
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
    $content->generationdata = json_encode([
        'curriculum_text' => $curriculumText,
        'content_strategy' => $contentStrategy,
        'video_length' => $videoLength,
        'language' => $language,
        'voice_gender' => $voiceGender,
        'avatar_strategy' => $avatarStrategy,
        'avtar_video_needed' => $avatarVideoNeeded,
        'content_type' => $contentType, // Save explicitly mapping
        'requested_at' => time(),
        'regen_count' => $regenCount
    ]);
    $content->timecreated = time();
    $content->timemodified = time();

    $contentId = $DB->insert_record('local_lecturebot_content', $content);
    
    // ==========================================
    // NEW: Queue Adhoc Task
    // ==========================================
    // Create Adhoc Task (Real or Mock based on config)
    // Create Adhoc Task (Real or Mock based on config)
    if (defined('DEVELOPER_MODE') && DEVELOPER_MODE) {
        $task = new \local_lecturebot\task\generate_content_task_mock();
        $task->set_custom_data([
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
            'content_type' => $contentType // Pass to task
        ]);
        
        // DEVELOPER MODE: EXECUTE SYNCHRONOUSLY
        // Bypassing Adhoc Queue to avoid Cron dependencies in local dev
        error_log("LectureBot: [DEV] Executing mock task synchronously");
        $task->execute();
        
    } else {
        $task = new \local_lecturebot\task\generate_content_task();
        $task->set_custom_data([
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
            'content_type' => $contentType // Pass to task
        ]);
        
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

/**
 * Helper to query Azure Blob Storage for the highest regen_count
 * Matches folders like Tutorial_{courseid}_{sectionid}_{count}
 */
/**
 * Execute Azure Blob List API call
 */
function execute_azure_blob_list_call($accountName, $accountKey, $containerName, $prefix)
{
    if (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
         error_log("LectureBot: Azure credentials not defined.");
         return null;
    }

    $url = "https://{$accountName}.blob.core.windows.net/{$containerName}" .
           "?restype=container&comp=list&delimiter=/&prefix={$prefix}";
    
    $date = gmdate('D, d M Y H:i:s T', time());
    $canonicalizedHeaders = "x-ms-date:$date\nx-ms-version:2020-04-08";
    $canonicalizedResource = "/{$accountName}/{$containerName}\ncomp:list\ndelimiter:/\n" .
                             "prefix:{$prefix}\nrestype:container";
    
    $stringToSign = "GET\n\n\n\n\n\n\n\n\n\n\n\n" .
                    $canonicalizedHeaders . "\n" .
                    $canonicalizedResource;
                    
    $signature = base64_encode(hash_hmac('sha256', utf8_encode($stringToSign), base64_decode($accountKey), true));
    $authHeader = "SharedKey $accountName:$signature";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "x-ms-date: $date",
            "x-ms-version: 2020-04-08",
            "Authorization: $authHeader"
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 10
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("LectureBot Azure List failed: $httpCode. Response: " . substr($response, 0, 100));
        return null;
    }

    return $response;
}

/**
 * Parse Azure XML response to find max regen count
 */
function parse_azure_blob_list_response($response)
{
    $maxCount = -1;
    try {
        $xml = new SimpleXMLElement($response);
        if (!isset($xml->Blobs->BlobPrefix)) {
            error_log("LectureBot: No BlobPrefix found in XML");
            return 0;
        }

        foreach ($xml->Blobs->BlobPrefix as $prefixNode) {
            $dirName = (string)$prefixNode->Name;
            if (preg_match('/_(\d+)\/$/', $dirName, $matches)) {
                $count = (int)$matches[1];
                if ($count > $maxCount) {
                    $maxCount = $count;
                }
            }
        }
    } catch (Exception $e) {
        error_log("LectureBot XML Parse Error: " . $e->getMessage());
        return 0;
    }
    
    return $maxCount + 1;
}

/**
 * Helper to query Azure Blob Storage for the highest regen_count
 * Matches folders like Tutorial_{courseid}_{sectionid}_{count}
 */
function get_azure_regen_count($courseid, $sectionid, $tenantId)
{
    // Check credentials first
    if (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
         error_log("LectureBot: Azure credentials not defined, falling back to 0");
         return 0;
    }

    $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
    $prefix = "Tutorial_{$courseid}_{$sectionid}_";

    $response = execute_azure_blob_list_call($accountName, $accountKey, $containerName, $prefix);

    if ($response) {
        return parse_azure_blob_list_response($response);
    }
    
    return 0;
}