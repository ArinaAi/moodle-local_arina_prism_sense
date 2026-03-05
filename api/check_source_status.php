<?php
/**
 * API endpoint to check if a source PDF's backend batch has finished processing.
 *
 * Returns { "processed": true } when it is safe to delete the source,
 * or { "processed": false } when the batch is still in progress.
 *
 * Network safety: Returns { "processed": false, "network_error": true } on any
 * network/connectivity error to prevent deletion during uncertain state.
 * This ensures data integrity over convenience.
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');

header('Content-Type: application/json');

try {
    $courseid = required_param('courseid', PARAM_INT);
    $sourceid  = required_param('sourceid', PARAM_INT);

    // Require login and capability.
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);

    // Fetch the source record.
    $source = $DB->get_record('local_lecturebot_sources', ['id' => $sourceid, 'courseid' => $courseid]);

    if (!$source) {
        // Source not found — treat as processed (fail-safe).
        echo json_encode(['processed' => true]);
        exit;
    }

    // No batch_id means the file was stored locally only (backend upload disabled).
    // Always allow deletion.
    if (empty($source->batch_id)) {
        echo json_encode(['processed' => true]);
        exit;
    }

    $batchId = $source->batch_id;

    // Backend batch processing completes within a few minutes at most.
    // If the source was uploaded more than 30 minutes ago, it is definitely
    // processed — skip the backend API call entirely to avoid redundant requests
    // every time the Sources Modal is opened.
    $uploadedSecondsAgo = time() - (int)$source->timecreated;
    if ($uploadedSecondsAgo > 1800) { // 30 minutes
        echo json_encode(['processed' => true]);
        exit;
    }


    $apiKey = get_config('local_lecturebot', 'api_key');
    $checkUrl = LECTUREBOT_API_CHECK_BATCH_STATUS . '?' . http_build_query(
        ['batch_id' => $batchId],
        '',
        '&'
    );

    $ch = curl_init($checkUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => [
            'X-Api-key: ' . $apiKey,
        ],
    ]);

    $response     = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError    = curl_error($ch);
    curl_close($ch);

    // On any transport or HTTP error, block deletion — we cannot confirm the status.
    if ($curlError || $httpCode !== 200 || !$response) {
        error_log(
            'LectureBot check_source_status: backend call failed for batch ' .
            $batchId .
            ' (HTTP ' . $httpCode . '): ' . $curlError
        );
        echo json_encode(['processed' => false, 'network_error' => true]);
        exit;
    }

    $data = json_decode($response, true);

    if (!is_array($data)) {
        // Malformed JSON — block deletion, cannot confirm status.
        error_log('LectureBot check_source_status: invalid JSON for batch ' . $batchId);
        echo json_encode(['processed' => false, 'network_error' => true]);
        exit;
    }

    // The batch is considered processed only when all uploads are completed.
    $allDone = isset($data['all_uploads_completed']) && $data['all_uploads_completed'] === true;

    error_log(
        'LectureBot check_source_status: batch ' . $batchId .
        ' all_uploads_completed=' . ($allDone ? 'true' : 'false')
    );

    echo json_encode(['processed' => $allDone]);

} catch (Exception $e) {
    // Block deletion on unexpected exceptions — status is unknown.
    error_log('LectureBot check_source_status exception: ' . $e->getMessage());
    echo json_encode(['processed' => false, 'network_error' => true]);
}
