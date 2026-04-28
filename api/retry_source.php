<?php

/**
 * API endpoint to retry a failed PDF upload in its batch.
 *
 * Calls the backend retry endpoint for the given upload_id so the backend
 * re-processes the PDF without requiring a fresh file upload from the browser.
 * On success the local processing_status for the source row is reset to
 * 'processing' so the polling loop picks it up on the next tick.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once(__DIR__ . '/../config_api.php');

header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['sourceid'])) {
        throw new moodle_exception('Missing source ID');
    }

    $sourceid = (int) $input['sourceid'];
    $courseid = required_param('courseid', PARAM_INT);

    // Auth checks.
    require_login($courseid);
    CompanyConfig::bootstrap($USER->id);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);
    require_sesskey();

    // Load the source record.
    $source = $DB->get_record('local_arina_prism_sense_sources', ['id' => $sourceid, 'courseid' => $courseid]);
    if (!$source) {
        throw new moodle_exception('Source not found');
    }

    // Only failed uploads can be retried.
    if ($source->processing_status !== 'failed') {
        throw new moodle_exception('Only failed uploads can be retried');
    }

    if (empty($source->upload_id)) {
        throw new moodle_exception('No upload_id stored for this source — cannot retry');
    }

    if (empty($source->batch_id)) {
        throw new moodle_exception('No batch_id stored for this source — cannot retry');
    }

    $apiKey = CompanyConfig::getApiKey();

    // Build the retry URL:
    // POST {BOT_BASE_URL}/batches/{batch_id}/uploads/{upload_id}/retry
    // The batch_id stored in the DB is already the full backend identifier
    // (e.g. "org-130-57a7849a-fd86-4777-acb6-f378cb4fbd0e").
    $retryUrl = API_BATCH_UPLOADS_BASE
        . '/' . urlencode($source->batch_id)
        . '/uploads/' . urlencode($source->upload_id)
        . '/retry';

    error_log("ArinaPrismSense retry_source: calling $retryUrl for source $sourceid");

    $ch = curl_init($retryUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => '',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => ['X-Api-Key: ' . $apiKey],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new moodle_exception('cURL error calling retry endpoint: ' . $curlError);
    }

    if ($httpCode === 401) {
        throw new moodle_exception('API key is missing or incorrect. Please check your settings.');
    }

    if ($httpCode !== 200 && $httpCode !== 201) {
        $decoded = json_decode($response, true);
        $rawDetail = $decoded['detail'] ?? null;
        if (is_string($rawDetail)) {
            $detail = $rawDetail;
        } elseif ($rawDetail !== null) {
            $detail = json_encode($rawDetail);
        } else {
            $detail = 'HTTP ' . $httpCode;
        }
        throw new moodle_exception('Backend retry failed: ' . $detail);
    }

    // Success — flip the local status back to processing so the poller picks it up.
    $DB->set_field('local_arina_prism_sense_sources', 'processing_status', 'processing', ['id' => $sourceid]);

    error_log("ArinaPrismSense retry_source: source $sourceid reset to 'processing'");

    echo json_encode(['status' => 'success', 'processing_status' => 'processing']);
} catch (Exception $e) {
    error_log('ArinaPrismSense retry_source exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'error' => $e->getMessage()]);
}
