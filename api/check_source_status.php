<?php
/**
 * API endpoint to check if a source PDF's backend batch has finished processing.
 *
 * Now also writes the resolved processing_status back to the DB so the
 * poll_processing_status.php endpoint (and future callers) always have
 * an up-to-date cached status.
 *
 * Returns:
 *   { "processed": true,  "processing_status": "uploaded" }  — done
 *   { "processed": true,  "processing_status": "failed"   }  — doc processing failed
 *   { "processed": false, "processing_status": "processing" } — still in progress
 *   { "processed": false, "processing_status": "processing", "network_error": true } — cannot reach backend
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

use local_lecturebot\CompanyConfig;

require_once(__DIR__ . '/../config_api.php');

header('Content-Type: application/json');

try {
    $courseid = required_param('courseid', PARAM_INT);
    $sourceid = required_param('sourceid', PARAM_INT);

    // Require login and capability.
    require_login($courseid);
    CompanyConfig::bootstrap($USER->id);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

    // Fetch the source record.
    $source = $DB->get_record('local_lecturebot_sources', ['id' => $sourceid, 'courseid' => $courseid]);

    if (!$source) {
        // Source not found — treat as processed (fail-safe).
        echo json_encode(['processed' => true, 'processing_status' => 'uploaded']);
        exit;
    }

    // No batch_id means the file was stored locally only (backend upload disabled).
    // Always allow deletion and treat as uploaded.
    if (empty($source->batch_id)) {
        echo json_encode(['processed' => true, 'processing_status' => 'uploaded']);
        exit;
    }

    // If already resolved in DB, return cached status immediately — no backend call needed.
    if (isset($source->processing_status) && $source->processing_status !== 'processing') {
        $isProcessed = $source->processing_status !== 'processing';
        echo json_encode([
            'processed' => $isProcessed,
            'processing_status' => $source->processing_status,
        ]);
        exit;
    }

    $batchId = $source->batch_id;




    $apiKey = CompanyConfig::getApiKey();
    $checkUrl = API_CHECK_BATCH_STATUS . '?' . http_build_query(
        ['batch_id' => $batchId],
        '',
        '&'
    );

    $ch = curl_init($checkUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'X-Api-key: ' . $apiKey,
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // On any transport or HTTP error, block deletion — we cannot confirm the status.
    if ($curlError || $httpCode !== 200 || !$response) {
        error_log(
            'LectureBot check_source_status: backend call failed for batch ' .
            $batchId .
            ' (HTTP ' . $httpCode . '): ' . $curlError
        );
        echo json_encode(['processed' => false, 'processing_status' => 'processing', 'network_error' => true]);
        exit;
    }

    $data = json_decode($response, true);

    if (!is_array($data)) {
        // Malformed JSON — block deletion, cannot confirm status.
        error_log('LectureBot check_source_status: invalid JSON for batch ' . $batchId);
        echo json_encode(['processed' => false, 'processing_status' => 'processing', 'network_error' => true]);
        exit;
    }

    // Determine processing outcome from the batch response.
    // A batch is complete when all_uploads_completed === true.
    $allUploadsCompleted = isset($data['all_uploads_completed']) && $data['all_uploads_completed'] === true;

    if ($allUploadsCompleted) {
        // Check if any individual upload has a failed/error status.
        // The backend uses 'completed' for success and any other non-processing value
        // (e.g. 'failed', 'error') indicates a failure.
        $hasFailed = false;
        if (!empty($data['upload_details']) && is_array($data['upload_details'])) {
            foreach ($data['upload_details'] as $detail) {
                $uploadStatus = isset($detail['status']) ? $detail['status'] : '';
                if ($uploadStatus !== 'completed' && $uploadStatus !== 'processing') {
                    $hasFailed = true;
                    break;
                }
            }
        }

        $newStatus = $hasFailed ? 'failed' : 'uploaded';
        $DB->set_field('local_lecturebot_sources', 'processing_status', $newStatus, ['id' => $sourceid]);

        error_log(
            'LectureBot check_source_status: batch ' . $batchId .
            ' resolved to processing_status=' . $newStatus
        );

        echo json_encode(['processed' => true, 'processing_status' => $newStatus]);
    } else {
        // Still processing.
        error_log(
            'LectureBot check_source_status: batch ' . $batchId . ' still processing'
        );
        echo json_encode(['processed' => false, 'processing_status' => 'processing']);
    }

} catch (Exception $e) {
    // Block deletion on unexpected exceptions — status is unknown.
    error_log('LectureBot check_source_status exception: ' . $e->getMessage());
    echo json_encode(['processed' => false, 'processing_status' => 'processing', 'network_error' => true]);
}
