<?php
/**
 * API endpoint to securely stream video from Azure
 * Redirects to a temporary SAS URL
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once __DIR__ . '/../../../config.php';

use local_lecturebot\CompanyConfig;

require_once __DIR__ . '/../configurator_azure.php';
require_once __DIR__ . '/../lib_azure_storage.php';
require_once __DIR__ . '/../config_api.php';

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = required_param('contentid', PARAM_INT);
    
    // Require login
    require_login($courseid);
    CompanyConfig::bootstrap($USER->id);
    // Any enrolled user can view content
    
    // Get content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);
    
    if ($content->courseid != $courseid) {
        throw new moodle_exception('Content does not belong to this course');
    }
    
    // Parse generation data to find video
    $genData = json_decode($content->generationdata, true);
    
    $blobName = null;
    $containerName = null;
    
    // Check new structure (Azure Folder)
    if (isset($genData['azure_blob_name'])) {
        $blobName = $genData['azure_blob_name'];
        $containerName = $genData['azure_container'] ?? null;
    } elseif (isset($genData['video_file'])) {
        // Fallback or local? If local file path, we can't stream via Azure SAS easily unless uploaded
        // But the plan assumes Azure storage.
        // If it's a local file in Moodle (tempdir), we might need send_file
        // But let's assume standard Azure flow for "Video" type content
    }
    
    if (!$blobName) {
        throw new moodle_exception('Video file not found in content record');
    }
    
    $apiKey = CompanyConfig::getApiKey();
    $tenantId = CompanyConfig::getTenantId();
    
    if (!$containerName) {
         $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
    }
    
    // Release session lock early — video streaming is long-running and
    // holding the session lock blocks ALL other Moodle requests for this user.
    \core\session\manager::write_close();

    // Construct Auth Service Validate URL
    $authValidateUrl = AUTH_SERVICE_URL .
        '?container=' . urlencode($containerName) .
        '&blob_path=' . urlencode($blobName);

    if (empty($apiKey)) {
        throw new moodle_exception('API key is not configured in settings.');
    }

    $ch = curl_init($authValidateUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($response)) {
        throw new moodle_exception('Failed to fetch SAS URL from Auth Service. HTTP ' .
        $httpCode . ' Error: ' . $curlErr);
    }

    $responseData = json_decode($response, true);
    if (!isset($responseData['url'])) {
        throw new moodle_exception('Auth Service response did not contain a SAS URL.');
    }

    // Instantly redirect the browser to the secure Azure CDN URL
    header("Location: " . $responseData['url'], true, 302);
    exit;
    
} catch (Exception $e) {
    http_response_code(404);
    // DEBUG INFORMATION
    $debugInfo = "Error: " . $e->getMessage();
    if (isset($containerName)) {$debugInfo .= " | Container: " . $containerName;}
    if (isset($blobName)) {$debugInfo .= " | Blob: " . $blobName;}
    
    die($debugInfo);
}
