<?php
/**
 * Polling endpoint — checks processing status for all 'processing' sources in a section.
 *
 * Called by the frontend on a timer (~60 s) when the Sources Modal is open and
 * at least one source has processing_status = 'processing'.
 *
 * Optimisation: sources are grouped by batch_id so that PDFs uploaded together
 * in a single batch require only ONE backend API call (not one per source row).
 * Each source is then matched to its own entry in upload_details via upload_id.
 *
 * Returns a map of sourceid -> processing_status for all sources that were checked.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once(__DIR__ . '/../config_api.php');
require_once(__DIR__ . '/../classes/EmailNotifier.php');

header('Content-Type: application/json');

try {
    $courseid = required_param('courseid', PARAM_INT);
    $sectionid = optional_param('sectionid', null, PARAM_INT);

    // Require login and capability.
    require_login($courseid);
    CompanyConfig::bootstrap($USER->id);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

    // Fetch all sources still in 'processing' state.
    $params = ['courseid' => $courseid, 'processing_status' => 'processing'];
    if ($sectionid !== null) {
        $params['sectionid'] = $sectionid;
    }

    $sources = $DB->get_records('local_arina_prism_sense_sources', $params);

    if (empty($sources)) {
        echo json_encode(['success' => true, 'statuses' => []]);
        exit;
    }

    $apiKey = CompanyConfig::getApiKey();
    $statuses = [];

    // -------------------------------------------------------------------------
    // STEP 1 — Handle sources without a batch_id (shouldn't happen normally).
    //          Mark them uploaded defensively and exclude from batch grouping.
    // -------------------------------------------------------------------------
    foreach ($sources as $sourceId => $source) {
        if (empty($source->batch_id)) {
            $DB->set_field('local_arina_prism_sense_sources', 'processing_status', 'uploaded', ['id' => $sourceId]);
            $statuses[$sourceId] = 'uploaded';
            unset($sources[$sourceId]);
        }
    }

    if (empty($sources)) {
        echo json_encode(['success' => true, 'statuses' => $statuses]);
        exit;
    }

    // -------------------------------------------------------------------------
    // STEP 2 — Group remaining sources by batch_id.
    //
    //   [ 'batch-AAA' => [source1, source2],   ← uploaded together, 1 API call
    //     'batch-BBB' => [source3] ]            ← uploaded separately, 1 API call
    //
    // Without this grouping, 3 PDFs in the same batch would make 3 identical
    // HTTP requests. Now we make exactly 1 per unique batch_id.
    // -------------------------------------------------------------------------
    $batches = []; // batch_id => source[]
    foreach ($sources as $source) {
        $batches[$source->batch_id][] = $source;
    }

    // -------------------------------------------------------------------------
    // STEP 3 — One check_batch_status call per unique batch, then fan out
    //          to every source that belongs to that batch.
    // -------------------------------------------------------------------------
    foreach ($batches as $batchId => $batchSources) {

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
            CURLOPT_HTTPHEADER => ['X-Api-key: ' . $apiKey],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode !== 200 || !$response) {
            // Network/HTTP error — keep all sources in this batch as 'processing'.
            error_log(
                'LectureBot poll_processing_status: backend call failed for batch ' .
                $batchId . ' (HTTP ' . $httpCode . '): ' . $curlError
            );
            foreach ($batchSources as $source) {
                $statuses[(int) $source->id] = 'processing';
            }
            continue;
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            foreach ($batchSources as $source) {
                $statuses[(int) $source->id] = 'processing';
            }
            continue;
        }

        $uploadDetails = isset($data['upload_details']) && is_array($data['upload_details'])
            ? $data['upload_details']
            : [];

        // Pre-build lookup maps from the single API response so each source
        // row can find its detail in O(1) instead of scanning the array.
        $detailByUploadId = [];
        $detailByFilename = [];
        foreach ($uploadDetails as $detail) {
            if (!empty($detail['upload_id'])) {
                $detailByUploadId[$detail['upload_id']] = $detail;
            }
            if (!empty($detail['document_name'])) {
                $detailByFilename[$detail['document_name']] = $detail;
            }
        }

        // Resolve every source that belongs to this batch.
        foreach ($batchSources as $source) {
            $sourceId = (int) $source->id;

            // Primary match: by upload_id (stored at upload time — precise).
            $matchedDetail = null;
            if (!empty($source->upload_id) && isset($detailByUploadId[$source->upload_id])) {
                $matchedDetail = $detailByUploadId[$source->upload_id];
            }

            // Fallback: by filename, for rows that predate upload_id storage.
            if ($matchedDetail === null && isset($detailByFilename[$source->filename])) {
                $matchedDetail = $detailByFilename[$source->filename];
            }

            if ($matchedDetail === null) {
                // Batch may still be registering the file — try again next tick.
                $statuses[$sourceId] = 'processing';
                continue;
            }

            // Map backend per-file status → our internal processing_status.
            $fileStatus = $matchedDetail['status'] ?? '';

            if ($fileStatus === 'success') {
                $newStatus = 'uploaded';
            } elseif ($fileStatus === 'failed') {
                $newStatus = 'failed';
            } else {
                // 'processing', 'queued', or any unknown value → keep polling.
                $statuses[$sourceId] = 'processing';
                continue;
            }

            $DB->set_field('local_arina_prism_sense_sources', 'processing_status', $newStatus, ['id' => $sourceId]);
            $statuses[$sourceId] = $newStatus;

            // Resolve the uploader from the Moodle files table (sources table has no userid column).
            // We look up the file record that was written at upload time.
            $uploaderUser = null;
            if (!empty($source->fileitemid)) {
                $sqlWhere = "component = 'local_arina_prism_sense' AND filearea = 'sources'"
                    . " AND itemid = ? AND userid > 0 AND filename != '.'";
                $fileRecord = $DB->get_record_select(
                    'files',
                    $sqlWhere,
                    [$source->fileitemid],
                    'userid',
                    IGNORE_MULTIPLE
                );
                if ($fileRecord && !empty($fileRecord->userid)) {
                    $uploaderUser = $DB->get_record(
                        'user',
                        ['id' => $fileRecord->userid, 'deleted' => 0],
                        '*',
                        IGNORE_MISSING
                    );
                }
            }

            // Send email notification for the status transition.
            if ($uploaderUser) {
                try {
                    if ($newStatus === 'uploaded') {
                        \local_arina_prism_sense\EmailNotifier::sendSourceSuccess($source, $uploaderUser);
                    } else {
                        \local_arina_prism_sense\EmailNotifier::sendSourceFailure($source, $uploaderUser);
                    }
                } catch (\Throwable $emailEx) {
                    error_log('LectureBot poll_processing_status: email notification failed (non-fatal): ' .
                    $emailEx->getMessage());
                }
            } else {
                error_log('LectureBot poll_processing_status: could not resolve uploader for source ' .
                $sourceId . ', skipping email.');
            }

            error_log(
                'LectureBot poll_processing_status: source ' . $sourceId .
                ' (batch ' . $batchId . ', upload ' . ($source->upload_id ?? 'n/a') . ')' .
                ' file status "' . $fileStatus . '" → resolved to "' . $newStatus . '"'
            );
        }
    }

    echo json_encode(['success' => true, 'statuses' => $statuses]);

} catch (Exception $e) {
    error_log('LectureBot poll_processing_status exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
