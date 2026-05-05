<?php

/**
 * Download/view PPTX file from Azure
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once(__DIR__ . '/../config_api.php');


$contentid = required_param('contentid', PARAM_INT);
require_login();
CompanyConfig::bootstrap($USER->id);

// Get the content record
$content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

// Verify user has permission to generate/download content in this course
$context = context_course::instance($content->courseid);
require_capability('local/arina_prism_sense:generatecontent', $context);

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
    $containerName = $generationData['azure_container'] ?? 'blob-tutorial-gen-default';

    // Get the API key
    $apiKey = CompanyConfig::getApiKey();
    if (empty($apiKey)) {
        throw new moodle_exception('API key is not configured in settings.');
    }

    // Step 1: Call Auth Service to get a short-lived SAS URL for the blob.
    // This is the same two-step pattern used by stream_video.php, get_toc.php,
    // get_slide_images.php, and Utils::downloadFileViaAuthService.
    // The raw gateway (API_DOWNLOAD_ASSET) requires Azure identity credentials —
    // going through AUTH_SERVICE_URL avoids that requirement entirely.
    $authUrl = AUTH_SERVICE_URL
        . '?container=' . urlencode($containerName)
        . '&blob_path=' . urlencode($blobPath);

    $ch = curl_init($authUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $authResponse = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr      = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($authResponse)) {
        $errorData = json_decode($authResponse, true);
        $errorMsg  = $errorData['detail'] ?? "Auth Service returned HTTP {$httpCode}. Error: {$curlErr}";
        http_response_code($httpCode ?: 502);
        die("Download proxy failed: {$errorMsg}");
    }

    $authData = json_decode($authResponse, true);
    if (!isset($authData['url'])) {
        http_response_code(502);
        die('Download proxy failed: Auth Service response did not contain a SAS URL.');
    }

    // Step 2: Redirect the browser directly to the secure Azure SAS URL.
    // Azure will serve the file and handle Content-Disposition automatically.
    // Using a redirect avoids buffering the entire file in PHP memory.
    header("Location: " . $authData['url'], true, 302);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    die('Error retrieving file via proxy: ' . $e->getMessage());
}
