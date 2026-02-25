<?php
/**
 * API endpoint to securely stream video from Azure
 * Redirects to a temporary SAS URL
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once __DIR__ . '/../../../config.php';
require_once __DIR__ . '/../configurator_azure.php';
require_once __DIR__ . '/../lib_azure_storage.php';
require_once __DIR__ . '/../config_api.php';

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = required_param('contentid', PARAM_INT);
    
    // Require login
    require_login($courseid);
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
    
    $apiKey = get_config('local_lecturebot', 'api_key');
    $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
    
    if (!$containerName) {
         $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
    }
    
    // Construct Proxy URL (no api_key in query string — sent as header below)
    $proxyUrl = LECTUREBOT_API_DOWNLOAD_ASSET .
    '?blob_path=' . urlencode($blobName) .'&container=' . urlencode($containerName);

    if (empty($apiKey)) {
        throw new moodle_exception('API key is not configured in settings.');
    }

    // Build request headers — forward Range header if the browser sent one (needed for seeking)
    $curlHeaders = ["X-Api-key: {$apiKey}"];
    if (isset($_SERVER['HTTP_RANGE'])) {
        $curlHeaders[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
    }

    // Capture response headers from BFF
    $responseHeaders = [];
    $headersSet      = false;

    $ch = curl_init($proxyUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => $curlHeaders,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_RETURNTRANSFER => false,

        // Parse response headers out of every header line
        CURLOPT_HEADERFUNCTION => function ($ch, $headerLine) use (&$responseHeaders) {
            $trimmed = trim($headerLine);
            if (strpos($trimmed, ':') !== false) {
                [$name, $value] = explode(':', $trimmed, 2);
                $responseHeaders[strtolower(trim($name))] = trim($value);
            }
            return strlen($headerLine);
        },

        // On the FIRST body chunk, emit all PHP response headers BEFORE any output.
        // This is critical — PHP ignores header() calls once output has started.
        CURLOPT_WRITEFUNCTION  => function ($ch, $data) use (&$headersSet, &$responseHeaders) {
            if (!$headersSet) {
                http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE)); // 206 for range requests, 200 otherwise
                header('Content-Type: video/mp4');
                header('Accept-Ranges: bytes');
                if (isset($responseHeaders['content-range'])) {
                    header('Content-Range: ' . $responseHeaders['content-range']);
                }
                if (isset($responseHeaders['content-length'])) {
                    header('Content-Length: ' . $responseHeaders['content-length']);
                }
                header('Cache-Control: no-store');
                $headersSet = true;
            }
            echo $data;
            return strlen($data);
        },

        CURLOPT_TIMEOUT        => 300,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    curl_exec($ch);
    $curlErrNo = curl_errno($ch);
    $curlErr   = curl_error($ch);
    curl_close($ch);

    if ($curlErrNo) {
        throw new moodle_exception('cURL error connecting to BFF: ' . $curlErr);
    }
    exit;
    
} catch (Exception $e) {
    http_response_code(404);
    // DEBUG INFORMATION
    $debugInfo = "Error: " . $e->getMessage();
    if (isset($containerName)) {$debugInfo .= " | Container: " . $containerName;}
    if (isset($blobName)) {$debugInfo .= " | Blob: " . $blobName;}
    
    die($debugInfo);
}
