<?php
/**
 * Get TOC (Table of Contents) from Azure blob storage
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

    // Verify user has permission to generate content in this course
    $context = context_course::instance($content->courseid);
    require_capability('local/lecturebot:generatecontent', $context);

    // Release session lock to prevent blocking
    \core\session\manager::write_close();

    // Get the generation data
    $generationData = json_decode($content->generationdata, true);

    if (!isset($generationData['azure_folder'])) {
        throw new moodle_exception(
            'missingazurefolder',
            'local_lecturebot',
            '',
            null,
            'Content does not have Azure folder information'
        );
    }

    $azureFolderId = $generationData['azure_folder'];
    $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
    $containerName = isset($generationData['azure_container'])
        ? strtolower($generationData['azure_container'])
        : strtolower('Blob-Tutorial-Gen-' . $tenantId);

    // Fetch TOC from Azure
    $tocData = fetchTocFromAzure($azureFolderId, $containerName);

    echo json_encode([
        'status' => 'success',
        'toc' => $tocData
    ]);

} catch (Exception $e) {
    error_log('LectureBot get_toc error: ' . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'toc' => null
    ]);
}

/**
 * Fetch TOC JSON from Azure blob storage
 * @param string $azureFolderId Azure folder identifier
 * @param string $containerName Azure container name
 * @return array|null TOC data or null if not found
 */
function fetchTocFromAzure($azureFolderId, $containerName)
{
    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $accountKey = AZURE_STORAGE_ACCOUNT_KEY;

    // Build the blob path for toc.json
    $blobName = $azureFolderId . '/toc.json';

    // Generate SAS token for access
    $sasToken = generate_blob_sas_token($accountName, $containerName, $blobName, $accountKey);
    $blobUrl = get_azure_blob_url($accountName, $containerName, $blobName) . $sasToken;

    // Fetch the TOC file
    $ch = curl_init($blobUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("LectureBot: Failed to fetch TOC from Azure. HTTP: $httpCode, Error: $curlError");
        throw new moodle_exception(
            'tocfetchfailed',
            'local_lecturebot',
            '',
            null,
            'Failed to fetch TOC from storage'
        );
    }

    $tocData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('LectureBot: Invalid JSON in TOC file: ' . json_last_error_msg());
        throw new moodle_exception(
            'invalidtocformat',
            'local_lecturebot',
            '',
            null,
            'Invalid TOC data format'
        );
    }

    return $tocData;
}
