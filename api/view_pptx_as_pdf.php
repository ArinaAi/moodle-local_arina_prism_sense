<?php
/**
 * View PDF file from Azure (Fallback for PPTX Viewer)
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once __DIR__ . '/../../../config.php';
require_once __DIR__ . '/../configurator_azure.php';
require_once __DIR__ . '/../config_api.php';

use local_lecturebot\CompanyConfig;

$contentid = required_param('contentid', PARAM_INT);
require_login();

// Get the content record
$content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

// Verify user has access to this course
$context = context_course::instance($content->courseid);
require_capability('moodle/course:view', $context);

CompanyConfig::bootstrap($USER->id);

// Release session lock to prevent blocking
\core\session\manager::write_close();

// Determine filename
// Naming convention: tutorial_{courseid}.pdf
$blobName = "tutorial_{$content->courseid}.pdf";

// Check if file exists locally first (from generation data)
$generationData = json_decode($content->generationdata, true);
if (!empty($generationData['pdf_path']) && file_exists($generationData['pdf_path'])) {
    $localPath = $generationData['pdf_path'];
    $filesize = filesize($localPath);
    
    // Output headers
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $blobName . '"');
    header('Content-Length: ' . $filesize);
    header('Cache-Control: public, max-age=3600');
    
    // Output file
    readfile($localPath);
    exit;
}

try {
    // BFF Connection Details
    $apiKey = CompanyConfig::getApiKey();
    $tenantId = CompanyConfig::getTenantId();
    $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);

    if (empty($apiKey)) {
        throw new moodle_exception('API key is not configured in settings.');
    }

    // Construct the BFF proxy URL (no api_key in query string — sent as header below)
    $proxyUrl = API_DOWNLOAD_ASSET .
    '?blob_path=' . urlencode($blobName) .
    '&container=' . urlencode($containerName);

    // Fetch PDF from BFF via cURL, forwarding the X-Api-key header
    $ch = curl_init($proxyUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ["X-Api-key: {$apiKey}"],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $fileContent = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $curlError = curl_error($ch);
        curl_close($ch);
        throw new moodle_exception('cURL error connecting to BFF: ' . $curlError);
    }
    curl_close($ch);

    if ($httpCode !== 200) {
        http_response_code($httpCode);
        $errorResponse = json_decode($fileContent, true);
        $errorMsg = $errorResponse['detail'] ?? "File not found or access denied (HTTP {$httpCode})";
        die('PDF proxy failed: ' . $errorMsg);
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $blobName . '"');
    header('Content-Length: ' . strlen($fileContent));
    header('Cache-Control: public, max-age=3600');
    echo $fileContent;
    exit;

} catch (Exception $e) {
    http_response_code(500);
    die('Error retrieving file: ' . $e->getMessage());
}
