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

// Verify user has access to this course
$context = context_course::instance($content->courseid);
require_capability('moodle/course:view', $context);

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
    // Azure Storage Details
    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $containerName = AZURE_BLOB_CONTAINER_NAME; // 'bot-storage'
    $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
    
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
    $signature = base64_encode(hash_hmac('sha256', $stringToSign, base64_decode(AZURE_STORAGE_ACCOUNT_KEY), true));
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
    
    $fileContent = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new moodle_exception('error', 'moodle', '', 'cURL error: ' . curl_error($ch));
    }
    
    curl_close($ch);

    if ($httpCode !== 200) {
        http_response_code(404);
        die("File not found in storage (HTTP $httpCode)");
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
    die('Error retrieving file: ' . $e->getMessage());
}
