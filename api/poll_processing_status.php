<?php
/**
 * Polling endpoint — checks processing status for all 'processing' sources in a section.
 *
 * Called by the frontend on a timer (~15-20 s) when the Sources Modal is open and
 * at least one source has processing_status = 'processing'.
 *
 * For each such source, calls the backend batch-status API and updates the DB row.
 * Returns a map of sourceid -> processing_status for all sources that were checked.
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
    $sectionid = optional_param('sectionid', null, PARAM_INT);

    // Require login and capability.
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability(LECTUREBOT_CAPABILITY_GENERATE_CONTENT, $context);

    // Build query params for sources that are still processing.
    $params = ['courseid' => $courseid, 'processing_status' => 'processing'];
    if ($sectionid !== null) {
        $params['sectionid'] = $sectionid;
    }

    $sources = $DB->get_records('local_lecturebot_sources', $params);

    if (empty($sources)) {
        // Nothing to poll.
        echo json_encode(['success' => true, 'statuses' => []]);
        exit;
    }

    $apiKey = get_config('local_lecturebot', 'api_key');
    $statuses = [];

    foreach ($sources as $source) {
        $sourceId = (int) $source->id;

        // No batch_id — shouldn't happen for 'processing' rows, but handle defensively.
        if (empty($source->batch_id)) {
            $DB->set_field('local_lecturebot_sources', 'processing_status', 'uploaded', ['id' => $sourceId]);
            $statuses[$sourceId] = 'uploaded';
            continue;
        }



        // Call the backend batch-status API.
        $checkUrl = LECTUREBOT_API_CHECK_BATCH_STATUS . '?' . http_build_query(
            ['batch_id' => $source->batch_id],
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
            CURLOPT_HTTPHEADER => ['X-Api-key: ' . $apiKey],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode !== 200 || !$response) {
            // Network error — keep status as 'processing', skip this tick.
            error_log(
                'LectureBot poll_processing_status: backend call failed for batch ' .
                $source->batch_id . ' (HTTP ' . $httpCode . '): ' . $curlError
            );
            $statuses[$sourceId] = 'processing';
            continue;
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            $statuses[$sourceId] = 'processing';
            continue;
        }

        $allUploadsCompleted =
            isset($data['all_uploads_completed']) && $data['all_uploads_completed'] === true;

        if ($allUploadsCompleted) {
            // Check each upload_detail for failures.
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
            $DB->set_field('local_lecturebot_sources', 'processing_status', $newStatus, ['id' => $sourceId]);
            $statuses[$sourceId] = $newStatus;

            error_log(
                'LectureBot poll_processing_status: source ' . $sourceId .
                ' (batch ' . $source->batch_id . ') resolved to ' . $newStatus
            );
        } else {
            // Still processing.
            $statuses[$sourceId] = 'processing';
        }
    }

    echo json_encode(['success' => true, 'statuses' => $statuses]);

} catch (Exception $e) {
    error_log('LectureBot poll_processing_status exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
