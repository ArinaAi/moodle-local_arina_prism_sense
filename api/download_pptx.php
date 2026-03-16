<?php
/**
 * Download/view PPTX file from Azure
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../configurator_azure.php');

$contentid = required_param('contentid', PARAM_INT);
require_login();

// Get the content record
$content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

// Verify user has permission to generate/download content in this course
$context = context_course::instance($content->courseid);
require_capability('local/lecturebot:generatecontent', $context);

// Release session lock to prevent blocking
\core\session\manager::write_close();

// Determine filename
// Naming convention: tutorial_{courseid}.pptx
$blobName = "tutorial_{$content->courseid}.pptx";

// Check if file exists locally first (from generation data)
$generationData = json_decode($content->generationdata, true);
if (!empty($generationData['pptx_path']) && file_exists($generationData['pptx_path'])) {
    $localPath = $generationData['pptx_path'];
    $filesize = filesize($localPath);
    
    // Output headers
    header('Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation');
    header('Content-Disposition: attachment; filename="' . $blobName . '"');
    header('Content-Length: ' . $filesize);
    header('Cache-Control: public, max-age=3600');
    
    // Output file
    readfile($localPath);
    exit;
}

try {
    $blobPath = $generationData['azure_blob_name'] ?? $blobName;
    $containerName = $generationData['azure_container'] ?? AZURE_BLOB_CONTAINER_NAME;
    
    // Construct Proxy URL
    $proxyUrl = LECTUREBOT_API_DOWNLOAD_ASSET .
    '?blob_path=' . urlencode($blobPath) .
    '&container=' . urlencode($containerName);
    
    // Get the API key
    $apiKey = get_config('local_lecturebot', 'api_key');
    if (empty($apiKey)) {
        throw new moodle_exception('API key is not configured in settings.');
    }
    
    // Download the blob securely via the BFF proxy
    $ch = curl_init($proxyUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "X-Api-key: {$apiKey}"
        ],
        CURLOPT_TIMEOUT => 300,
        CURLOPT_CONNECTTIMEOUT => 30,
        // Disable SSL verification for local testing on 127.0.0.1
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);
    
    $fileContent = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new moodle_exception('error', 'moodle', '', 'cURL error connecting to BFF: ' . curl_error($ch));
    }
    
    curl_close($ch);

    if ($httpCode !== 200) {
        http_response_code($httpCode);
        $errorResponse = json_decode($fileContent, true);
        $errorMsg = $errorResponse['detail'] ?? "File not found or access denied (HTTP $httpCode)";
        die("Download proxy failed: " . $errorMsg);
    }

    // Output headers
    header('Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation');
    header('Content-Disposition: attachment; filename="' . $blobName . '"');
    header('Content-Length: ' . strlen($fileContent));
    header('Cache-Control: public, max-age=3600');
    
    echo $fileContent;
    exit;

} catch (Exception $e) {
    http_response_code(500);
    die('Error retrieving file via proxy: ' . $e->getMessage());
}
