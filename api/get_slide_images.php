<?php
/**
 * Get slide images from PPTX file
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Disable HTML error output to prevent breaking JSON response
define('NO_DEBUG_DISPLAY', true);
define('AJAX_SCRIPT', true);
define('REDIRECT_STDERR', ' 2>&1');
require_once __DIR__ . '/../../../config.php';
require_once __DIR__ . '/../configurator_azure.php';
require_once __DIR__ . '/../lib_azure_storage.php';
require_once __DIR__ . '/../config_api.php';

// Developer Mode: Redirect to mock handler
if (defined('DEVELOPER_MODE') && DEVELOPER_MODE) {
    require_once(__DIR__ . '/get_slide_images_mock.php');
    exit;
}

// Suppress all output before JSON
ob_start();

$contentid = required_param('contentid', PARAM_INT);
require_login(null, false);

// Clear any output that may have occurred
ob_clean();

header('Content-Type: application/json');

try {
    // Get the content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

// Verify user has access to this course
    $course = get_course($content->courseid);
    
    // Use can_access_course for robust permission check (handles role switching better)
    if (!can_access_course($course)) {
        throw new moodle_exception('noaccess', 'moodle', '', null, 'You do not have permission to view this content.');
    }
    
    // Release session lock to prevent blocking during long image extraction/upload
    \core\session\manager::write_close();

    // Get the generation data
    $generationData = json_decode($content->generationdata, true);
    
    // Extract images from Azure
    $images = extractImagesFromPptx('', $contentid);
    
    echo json_encode([
        'status' => 'success',
        'images' => $images,
        'slideCount' => count($images)
    ]);

} catch (Exception $e) {
    error_log('LectureBot get_slide_images error: ' . $e->getMessage());
    
    $errorMessage = $e->getMessage();
    if (strpos($errorMessage, 'API key is missing or incorrect') !== false) {
        http_response_code(401);
    } else {
        http_response_code(500);
    }
    
    echo json_encode([
        'status' => 'error',
        'error' => $errorMessage,
        'images' => []
    ]);
}

/**
 * Extract images from PPTX file
 * @param string $pptxPath Path to the PPTX file
 * @param int $contentid Content ID from database
 * @return array Array of base64 encoded images or Azure URLs
 */
function extractImagesFromPptx($pptxPath, $contentid)
{
    global $DB;

    // Get content info
    $content = $DB->get_record(
        'local_lecturebot_content',
        ['id' => $contentid],
        'courseid, sectionid,
        timecreated,
        generationdata'
    );
    if (!$content) {
        throw new moodle_exception('error', 'moodle', '', 'Content record not found');
    }

    $genData = json_decode($content->generationdata, true);
    $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;

    // Determine Azure paths
    $useNewStructure = isset($genData['azure_folder']);

    if ($useNewStructure) {
        return extractImagesFromAzure($genData, $tenantId);
    }

    return extractImagesFromZip($pptxPath);
}

/**
 * Extract images using Azure generation data
 * @param array $genData
 * @param int $tenantId
 * @return array
 */
function extractImagesFromAzure($genData, $tenantId)
{
    $azureFolderId = $genData['azure_folder'];
    $containerName = isset($genData['azure_container']) ?
        strtolower($genData['azure_container']) :
        strtolower('Blob-Tutorial-Gen-' . $tenantId);

    return generateAzureImageUrls($azureFolderId, $containerName);
}

/**
 * Calculate slide count from generation data
 * @param array $genData
 * @return int
 */
function calculateAzureSlideCount($genData)
{
    $slideCount = isset($genData['slide_count']) ? intval($genData['slide_count']) : 0;

    // Fallback: If slide_count missing, try to detect or guess
    if ($slideCount <= 0) {
        $slideCount = calculateSlidesFromResult($genData);
    }

    if ($slideCount <= 0) {
        $slideCount = 20; // Last resort fallback
    }

    return $slideCount;
}

/**
 * Calculate slide count from result data
 * @param array $genData
 * @return int
 */
function calculateSlidesFromResult($genData)
{
    if (!isset($genData['result'])) {
        return 0;
    }

    $resultData = is_string($genData['result']) ?
        json_decode($genData['result'], true) :
        $genData['result'];

    $count = 0;
    if (isset($resultData['results']) && is_array($resultData['results'])) {
        foreach ($resultData['results'] as $res) {
            if (isset($res['slideCount'])) {
                $count += $res['slideCount'];
            }
        }
    }
    return $count;
}

/**
 * Generate Azure image URLs via BFF Proxy
 * @param string $azureFolderId
 * @param string $containerName
 * @return array
 */
function generateAzureImageUrls($azureFolderId, $containerName)
{
    $images = [];
    $apiKey = get_config('local_lecturebot', 'api_key');

    if (empty($apiKey)) {
        throw new moodle_exception('API key not configured');
    }

    // 1. Fetch all SAS URLs for the slide_pngs folder in one single call
    $directoryPath = $azureFolderId . '/intermediate_chunks/slide_pngs/';
    $authValidateUrl = 'https://demo.arina.ai/dev2230/service/arina_auth_service/validate' .
        '?container=' . urlencode($containerName) .
        '&blob_path=' . urlencode($directoryPath) .
        '&list_folder=true';

    $ch = curl_init($authValidateUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 401) {
        error_log("LectureBot get_slide_images: Auth Service returned HTTP 401(API key is missing or incorrect)");
        throw new \local_lecturebot\exception\api_http_exception('API key is missing or incorrect.
        Please check your settings.');
    } elseif ($httpCode !== 200 || empty($response)) {
        error_log("LectureBot get_slide_images: Auth Service returned HTTP {$httpCode} Error: {$curlErr}");
        return $images;
    }

    $responseData = json_decode($response, true);
    if (!isset($responseData['files']) || !is_array($responseData['files'])) {
        error_log("LectureBot get_slide_images: Auth Service response missing 'files' array");
        return $images;
    }

    // 2. Parse the returned `files` array and extract the SAS URLs
    foreach ($responseData['files'] as $fileData) {
        $filename = $fileData['name'] ?? '';
        $sasUrl = $fileData['url'] ?? '';

        // Extract slide number from filename (e.g., "slide_10.png" -> 10)
        // This is crucial because list APIs don't guarantee numeric sorting
        if (!empty($filename) && !empty($sasUrl) && preg_match('/slide_(\d+)\.png/i', $filename, $matches)) {
            $images[] = [
                'filename'    => $filename,
                'data'        => $sasUrl,
                'slideNumber' => (int)$matches[1] + 1 // Frontend expects 1-based index (1-indexed rendering)
            ];
        }
    }

    // 3. Ensure images are explicitly sorted 1 to N, preventing unordered rendering
    usort($images, function ($a, $b) {
        return $a['slideNumber'] - $b['slideNumber'];
    });

    return $images;
}


/**
 * Extract images from local PPTX zip file (Legacy/Fallback)
 * @param string $pptxPath
 * @return array
 */
function extractImagesFromZip($pptxPath)
{
    $images = [];

    // Fallback: Try to extract embedded images from PPTX
    // This is used for legacy content or if New Structure logic wasn't applicable
    try {
        $zip = new ZipArchive();
        if ($zip->open($pptxPath) === true) {
            $extractedImages = processZipArchive($zip);
            $zip->close();

            if (!empty($extractedImages)) {
                // Sort by slide number
                usort($extractedImages, function ($a, $b) {
                    return $a['slideNumber'] - $b['slideNumber'];
                });
                return $extractedImages;
            }
        }
    } catch (Exception $e) {
        error_log('LectureBot: Error extracting images from PPTX: ' . $e->getMessage());
    }

    return $images;
}

/**
 * Process ZipArchive to find and extract images
 * @param ZipArchive $zip
 * @return array
 */
function processZipArchive($zip)
{
    $extractedImages = [];

    // Look for images in ppt/media/ directory
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);

        // Check if it's an image file in the media folder
        if (preg_match('/ppt\/media\/image(\\d+)\\.(png|jpg|jpeg|gif)/i', $filename, $matches)) {
            $imageData = $zip->getFromName($filename);
            if ($imageData !== false) {
                $extension = strtolower($matches[2]);
                $mimeType = 'image/' . ($extension === 'jpg' ? 'jpeg' : $extension);

                $extractedImages[] = [
                    'filename' => basename($filename),
                    'data' => 'data:' . $mimeType . ';base64,' . base64_encode($imageData),
                    'slideNumber' => (int)$matches[1]
                ];
            }
        }
    }

    return $extractedImages;
}
