<?php
/**
 * Generate content proxy - Updated for new flow with database tracking
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');
require_once(__DIR__ . '/../config_azure.php');

define('CURL_ERROR_PREFIX', 'cURL error: ');

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

// Increase PHP execution time
set_time_limit(600);
ini_set('max_execution_time', '600');
ini_set('memory_limit', '512M');

// Disable error display handled by NO_DEBUG_DISPLAY in moodle setup

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
        throw new moodle_exception('error', 'moodle', '', 'Section not found');
    }
    
    // Get curriculum from first Page activity or Label (text and media area) in the section
    $curriculumText = '';
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
            } elseif ($cm->modname == 'label') {
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
    
    // If still empty, throw error
    if (empty($curriculumText)) {
        throw new moodle_exception(
            'error',
            'moodle',
            '',
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
        throw new moodle_exception('error', 'moodle', '', 'No source PDFs found for this section');
    }

    // Note: The new API (http://0.0.0.0:8034/generate_pptx) doesn't require PDF upload
    // It generates slides based on curriculum text directly
    
    // Create database entry with status='generating'
    $content = new stdClass();
    $content->courseid = $courseid;
    $content->sectionid = $sectionid;
    $content->contenttype = 'slide-deck';
    $content->status = 'generating';
    $content->title = 'Slides: ' . $sectionName;
    $content->generationdata = json_encode([
        'curriculum_text' => $curriculumText,
        'content_strategy' => $contentStrategy,
        'requested_at' => time()
    ]);
    $content->timecreated = time();
    $content->timemodified = time();

    $contentId = $DB->insert_record('local_lecturebot_content', $content);
    
    // Call the external lecture content generation API
    // Using the new endpoint: http://0.0.0.0:8034/generate_pptx
    $apiUrl = LECTUREBOT_API_GENERATE_PPTX .
              '?curriculum_text=' . urlencode(trim($curriculumText)) .
              '&course_id=' . $courseid .
              '&video_length=' . $videoLength;

    error_log('LectureBot: Calling API URL: ' . $apiUrl);
    error_log('LectureBot: Video Length: ' . $videoLength);
    error_log('LectureBot: Curriculum length: ' . strlen($curriculumText) . ' characters');

    $ch = curl_init($apiUrl);
    
    if ($ch === false) {
        error_log('LectureBot: Failed to initialize cURL');
        
        // Update status to error
        $DB->update_record(
            'local_lecturebot_content',
            (object)[
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => 'Failed to initialize cURL',
                'timemodified' => time()
            ]
        );
        
        throw new moodle_exception('error', 'moodle', '', 'Failed to initialize cURL');
    }
    
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => '',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => LECTUREBOT_API_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => LECTUREBOT_API_CONNECT_TIMEOUT,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/x-www-form-urlencoded'
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        $curlError = curl_error($ch);
        curl_close($ch);
        error_log('LectureBot: cURL error: ' . $curlError);
        
        // Update status to error
        $DB->update_record(
            'local_lecturebot_content',
            (object)[
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => CURL_ERROR_PREFIX . $curlError,
                'timemodified' => time()
            ]
        );
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => CURL_ERROR_PREFIX . $curlError,
            'content_id' => $contentId
        ]);
        exit;
    }
    
    curl_close($ch);

    // Log the API response for debugging
    error_log('LectureBot: API response (HTTP ' . $http_code . '): ' . strlen($response) . ' bytes received');

    // Check if the response is successful
    if ($http_code === 200 && !empty($response)) {
        // Parse JSON response from backend
        $apiResponse = json_decode($response, true);
        
        if ($apiResponse && ((isset($apiResponse['success']) && $apiResponse['success'] === true) ||
            (isset($apiResponse['Success']) && $apiResponse['Success'] === true))) {
            error_log('LectureBot: Backend API returned success, fetching PPTX from Azure Blob Storage');
            
            // Construct blob name based on course ID
            // Pattern: tutorial_{courseid}.pptx
            $blobName = 'tutorial_' . $courseid . '.pptx';
            
            error_log('LectureBot: Attempting to download blob: ' . $blobName);
            
            try {
                // Download PPTX from Azure Blob Storage
                $pptxContent = downloadPptxFromAzure($blobName);
                
                if ($pptxContent === false || empty($pptxContent)) {
                    throw new moodle_exception('error', 'moodle', '', 'Failed to download PPTX from Azure Blob Storage'
                    );
                }
                
                error_log('LectureBot: Successfully downloaded PPTX from Azure (' . strlen($pptxContent) . ' bytes)');
                
                // Save the PPTX file locally
                $filename = 'slides_' . $contentId . '_' . time() . '.pptx';
                $filepath = $CFG->tempdir . '/lecturebot/' . $filename;
                
                // Create directory if it doesn't exist
                if (!is_dir($CFG->tempdir . '/lecturebot')) {
                    mkdir($CFG->tempdir . '/lecturebot', 0755, true);
                }
                
                file_put_contents($filepath, $pptxContent);
                
                error_log('LectureBot: PPTX file saved locally: ' . $filepath);
                
                // Count slides in PPTX
                $slideCount = countSlidesInPptx($filepath);
                
                error_log('LectureBot: PPTX contains ' . $slideCount . ' slides');
                
                // Create minimal result structure for frontend
                $resultsData = [
                    [
                        'topic' => $sectionName,
                        'slideCount' => $slideCount,
                        'pptxFile' => $filename
                    ]
                ];
                
                // Update status to ready and store the file info
                $DB->update_record(
                    'local_lecturebot_content',
                    (object)[
                        'id' => $contentId,
                        'status' => 'ready',
                        'generationdata' => json_encode(array_merge(
                            json_decode($content->generationdata, true),
                            [
                                'pptx_file' => $filename,
                                'pptx_path' => $filepath,
                                'slide_count' => $slideCount,
                                'completed_at' => time(),
                                'azure_blob_name' => $blobName,
                                'result' => [
                                    'status' => 'success',
                                    'results' => $resultsData
                                ]
                            ]
                        )),
                        'timemodified' => time()
                    ]
                );
                
                // Return success with content_id
                echo json_encode([
                    'status' => 'success',
                    'content_id' => $contentId,
                    'message' => 'Content generated successfully',
                    'pptx_file' => $filename,
                    'slide_count' => $slideCount,
                    'results' => $resultsData
                ]);
                
            } catch (Exception $azureError) {
                error_log('LectureBot: Azure download error: ' . $azureError->getMessage());
                
                $DB->update_record(
                    'local_lecturebot_content',
                    (object)[
                        'id' => $contentId,
                        'status' => 'error',
                        'errormessage' => 'Failed to download from Azure: ' . $azureError->getMessage(),
                        'timemodified' => time()
                    ]
                );
                
                http_response_code(500);
                echo json_encode([
                    'status' => 'error',
                    'error' => 'Failed to download from Azure: ' . $azureError->getMessage(),
                    'content_id' => $contentId
                ]);
            }
        } else {
            // API returned success=false or malformed response
            $errorMsg = isset($apiResponse['error']) ? $apiResponse['error'] : 'API returned unsuccessful response';
            
            error_log('LectureBot: API returned error: ' . $errorMsg);
            
            $DB->update_record(
                'local_lecturebot_content',
                (object)[
                    'id' => $contentId,
                    'status' => 'error',
                    'errormessage' => $errorMsg,
                    'timemodified' => time()
                    ]
            );
            
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'error' => $errorMsg,
                'content_id' => $contentId
            ]);
        }
    } else {
        // Log the actual response for debugging
        error_log('LectureBot: API Error Response Body: ' . substr($response, 0, 1000));
        
        // Try to parse the response as JSON to get error details
        $errorDetails = 'Generation failed with HTTP ' . $http_code;
        if (!empty($response)) {
            $jsonResponse = json_decode($response, true);
            if ($jsonResponse && isset($jsonResponse['error'])) {
                $errorDetails .= ': ' . $jsonResponse['error'];
            } else {
                $errorDetails .= ': ' . substr($response, 0, 200);
            }
        }
        
        // Update status to error
        $DB->update_record(
            'local_lecturebot_content',
            (object)[
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => $errorDetails,
                'timemodified' => time()
            ]
        );
        $DB->update_record(
            'local_lecturebot_content',
            (object)[
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => $errorDetails,
                'timemodified' => time()
            ]
        );
        
        http_response_code($http_code);
        echo json_encode([
            'status' => 'error',
            'error' => $errorDetails,
            'content_id' => $contentId
        ]);
    }
    
} catch (Exception $e) {
    error_log('LectureBot: Exception caught: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}

/**
 * Download PPTX file from Azure Blob Storage
 * @param string $blobName Name of the blob to download (e.g., tutorial_123.pptx)
 * @return string|false Binary content of the PPTX file, or false on failure
 */
function downloadPptxFromAzure($blobName)
{
    try {
        // Construct the blob URL
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        $containerName = AZURE_BLOB_CONTAINER_NAME;
        $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
        
        error_log('LectureBot: Azure blob URL: ' . $blobUrl);
        
        // Generate authorization header using Shared Key
        $date = gmdate('D, d M Y H:i:s T');
        $version = '2020-04-08';
        
        // Construct the string to sign
        $stringToSign = "GET\n" .  // HTTP Verb
                       "\n" .      // Content-Encoding
                       "\n" .      // Content-Language
                       "\n" .      // Content-Length
                       "\n" .      // Content-MD5
                       "\n" .      // Content-Type
                       "\n" .      // Date
                       "\n" .      // If-Modified-Since
                       "\n" .      // If-Match
                       "\n" .      // If-None-Match
                       "\n" .      // If-Unmodified-Since
                       "\n" .      // Range
                       "x-ms-date:{$date}\n" .
                       "x-ms-version:{$version}\n" .
                       "/{$accountName}/{$containerName}/{$blobName}";
        
        // Sign the string
        $signature = base64_encode(hash_hmac(
            'sha256',
            utf8_encode($stringToSign),
            base64_decode(AZURE_STORAGE_ACCOUNT_KEY),
            true
        ));
        $authHeader = "SharedKey {$accountName}:{$signature}";
        
        // Download the blob using cURL
        $ch = curl_init($blobUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "x-ms-date: {$date}",
                "x-ms-version: {$version}",
                "Authorization: {$authHeader}"
            ],
            CURLOPT_TIMEOUT => 300,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        
        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            error_log('LectureBot: cURL error downloading from Azure: ' . $error);
            throw new moodle_exception('error', 'moodle', '', CURL_ERROR_PREFIX . $error);
        }
        
        curl_close($ch);
        
        if ($httpCode !== 200) {
            error_log('LectureBot: Azure returned HTTP ' . $httpCode . ': ' . substr($content, 0, 500));
            throw new moodle_exception('error', 'moodle', '', 'Azure Blob Storage returned HTTP ' . $httpCode);
        }
        
        error_log('LectureBot: Successfully downloaded ' . strlen($content) . ' bytes from Azure');
        
        return $content;
        
    } catch (Exception $e) {
        error_log('LectureBot: Error downloading from Azure: ' . $e->getMessage());
        return false;
    }
}

/**
 * Count slides in PPTX file
 * @param string $pptxPath Path to the PPTX file
 * @return int Number of slides
 */
function countSlidesInPptx($pptxPath)
{
    $slideCount = 0;
    
    try {
        $zip = new ZipArchive();
        if ($zip->open($pptxPath) === true) {
            // Count slide XML files
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (preg_match('/ppt\/slides\/slide(\d+)\.xml/', $filename, $matches)) {
                    $slideNumber = (int)$matches[1];
                    $slideCount = max($slideCount, $slideNumber);
                }
            }
            $zip->close();
        }
    } catch (Exception $e) {
        error_log('LectureBot: Error counting slides in PPTX: ' . $e->getMessage());
    }
    
    return $slideCount;
}