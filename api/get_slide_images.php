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
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../configurator_azure.php');
require_once(__DIR__ . '/../lib_azure_storage.php');

// Developer Mode: Redirect to mock handler
if (defined('DEVELOPER_MODE') && DEVELOPER_MODE) {
    require_once(__DIR__ . '/get_slide_images_mock.php');
    exit;
}

// Suppress all output before JSON
ob_start();

$contentid = required_param('contentid', PARAM_INT);
require_login();

// Clear any output that may have occurred
ob_clean();

header('Content-Type: application/json');

try {
    // Get the content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has access to this course
    $context = context_course::instance($content->courseid);
    require_capability('moodle/course:view', $context);
    
    // Release session lock to prevent blocking during long image extraction/upload
    \core\session\manager::write_close();

    // Get the PPTX file path from generation data
    $generationData = json_decode($content->generationdata, true);
    if (!isset($generationData['pptx_path']) || !file_exists($generationData['pptx_path'])) {
        echo json_encode([
            'status' => 'error',
            'error' => 'PPTX file not found',
            'images' => []
        ]);
        exit;
    }

    $filepath = $generationData['pptx_path'];
    
    // Extract images from PPTX with version tracking
    $images = extractImagesFromPptx($filepath, $contentid);
    
    echo json_encode([
        'status' => 'success',
        'images' => $images,
        'slideCount' => count($images)
    ]);

} catch (Exception $e) {
    error_log('LectureBot get_slide_images error: ' . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
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

    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $accountKey = AZURE_STORAGE_ACCOUNT_KEY;

    $slideCount = calculateAzureSlideCount($genData);

    return generateAzureImageUrls($slideCount, $azureFolderId, $containerName, $accountName, $accountKey);
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
 * Generate Azure image URLs with SAS tokens
 * @param int $slideCount
 * @param string $azureFolderId
 * @param string $containerName
 * @param string $accountName
 * @param string $accountKey
 * @return array
 */
function generateAzureImageUrls($slideCount, $azureFolderId, $containerName, $accountName, $accountKey)
{
    $images = [];

    for ($i = 0; $i < $slideCount; $i++) {
        // Actual format found in Azure: slide_0.png, slide_1.png (0-indexed, unpadded)
        $filename = 'slide_' . $i . '.png';
        $blobName = $azureFolderId . '/intermediate_chunks/slide_pngs/' . $filename;

        // Generate SAS Token
        $sasToken = generate_blob_sas_token($accountName, $containerName, $blobName, $accountKey);

        $azureUrl = get_azure_blob_url($accountName, $containerName, $blobName) . $sasToken;

        $images[] = [
            'filename' => $filename,
            'data' => $azureUrl,
            'slideNumber' => $i + 1 // Frontend expects 1-based index
        ];
    }

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
                usort($extractedImages, function($a, $b) {
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
