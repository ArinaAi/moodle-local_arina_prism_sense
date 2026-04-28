<?php

/**
 * Get TOC (Table of Contents) from Azure blob storage
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Disable HTML error output to prevent breaking JSON response
define('NO_DEBUG_DISPLAY', true);
define('AJAX_SCRIPT', true);
define('REDIRECT_STDERR', ' 2>&1');
require_once(__DIR__ . '/../../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once(__DIR__ . '/../config_api.php');

// Suppress all output before JSON
ob_start();

$contentid = required_param('contentid', PARAM_INT);
require_login();
CompanyConfig::bootstrap($USER->id);

// Clear any output that may have occurred
ob_clean();

header('Content-Type: application/json');

try {
    // Get the content record
    $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has permission to generate content in this course
    $context = context_course::instance($content->courseid);
    require_capability('local/arina_prism_sense:generatecontent', $context);

    // Release session lock to prevent blocking
    \core\session\manager::write_close();

    // Get the generation data
    $generationData = json_decode($content->generationdata, true);

    if (!isset($generationData['azure_folder'])) {
        throw new moodle_exception(
            'missingazurefolder',
            'local_arina_prism_sense',
            '',
            null,
            'Content does not have Azure folder information'
        );
    }

    $azureFolderId = $generationData['azure_folder'];
    $orgId = CompanyConfig::getOrgId();
    $apiKey = CompanyConfig::getApiKey() ?? get_config('local_arina_prism_sense', 'api_key');
    $containerName = isset($generationData['azure_container'])
        ? strtolower($generationData['azure_container'])
        : strtolower('Blob-Tutorial-Gen-' . $orgId);

    // Fetch TOC via Auth Service
    $tocData = localArinaPrismSenseFetchTocFromAzure($azureFolderId, $containerName, $apiKey);

    echo json_encode([
        'status' => 'success',
        'toc' => $tocData,
    ]);
} catch (Exception $e) {
    error_log('ArinaPrismSense get_toc error: ' . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'toc' => null,
    ]);
}

/**
 * Fetch TOC JSON via the Auth Service (SAS URL gateway).
 * No Azure credentials required.
 *
 * @param string $azureFolderId Azure folder identifier
 * @param string $containerName Azure container name
 * @param string $apiKey        Arina API key
 * @return array TOC data
 */
function localArinaPrismSenseFetchTocFromAzure($azureFolderId, $containerName, $apiKey)
{
    $blobName = $azureFolderId . '/toc.json';
    $authUrl = AUTH_SERVICE_URL
        . '?container=' . urlencode($containerName)
        . '&blob_path=' . urlencode($blobName);

    $ch = curl_init($authUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($response)) {
        error_log("ArinaPrismSense: Auth service failed for TOC SAS URL. HTTP: $httpCode, Error: $curlError");
        throw new moodle_exception(
            'tocfetchfailed',
            'local_arina_prism_sense',
            '',
            null,
            'Failed to fetch TOC SAS URL from Auth Service'
        );
    }

    $sasData = json_decode($response, true);
    if (!isset($sasData['url'])) {
        error_log('ArinaPrismSense: Auth service TOC response missing url field');
        throw new moodle_exception(
            'tocfetchfailed',
            'local_arina_prism_sense',
            '',
            null,
            'Auth Service response did not contain a SAS URL'
        );
    }

    // Fetch the TOC JSON from the SAS URL
    $ch = curl_init($sasData['url']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $tocResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("ArinaPrismSense: Failed to fetch TOC from SAS URL. HTTP: $httpCode, Error: $curlError");
        throw new moodle_exception(
            'tocfetchfailed',
            'local_arina_prism_sense',
            '',
            null,
            'Failed to fetch TOC from storage'
        );
    }

    $tocData = json_decode($tocResponse, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('ArinaPrismSense: Invalid JSON in TOC file: ' . json_last_error_msg());
        throw new moodle_exception(
            'invalidtocformat',
            'local_arina_prism_sense',
            '',
            null,
            'Invalid TOC data format'
        );
    }

    return $tocData;
}
