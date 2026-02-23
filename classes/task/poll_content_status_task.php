<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');

/**
 * Scheduled task to poll backend for content generation status
 *
 * This task runs every minute and checks the backend's batch /status/batch endpoint
 * for all content items with status='generating'. A single request is made for all
 * pending items, reducing backend load as the system scales.
 *
 * @package    local_lecturebot
 * @copyright  2025
 */
class poll_content_status_task extends \core\task\scheduled_task
{
    /**
     * Get a descriptive name for this task
     *
     * @return string
     */
    public function get_name()
    {
        return get_string('task:poll_content_status', 'local_lecturebot');
    }

    /**
     * Execute the task.
     *
     * Fetches all pending content items, collects their request_ids, calls the
     * batch status endpoint once, then processes each result individually.
     */
    public function execute()
    {
        global $DB;

        mtrace("Starting poll_content_status_task...");

        // Find all content items that are still generating and have a request_id
        $pendingContent = $DB->get_records_select(
            'local_lecturebot_content',
            "status = 'generating' AND request_id IS NOT NULL AND request_id != ''",
            null,
            'timemodified ASC'
        );

        if (empty($pendingContent)) {
            mtrace("No pending content to check.");
            return;
        }

        $count = count($pendingContent);
        mtrace("Found {$count} content item(s) to check.");

        // Collect all request_ids for the batch call
        $requestIdToContent = [];
        foreach ($pendingContent as $content) {
            if (!empty($content->request_id)) {
                $requestIdToContent[$content->request_id] = $content;
            }
        }

        $requestIds = array_keys($requestIdToContent);

        // Single batch call to backend — replaces N individual calls
        mtrace("Calling batch status endpoint with " . count($requestIds) . " request_id(s)...");
        $batchResponse = $this->checkBatchBackendStatus($requestIds);

        if ($batchResponse === null) {
            mtrace("Batch status call failed or returned no response. Will retry on next run.");
            return;
        }

        // Process each item using its status from the batch response
        foreach ($requestIdToContent as $requestId => $content) {
            if (!isset($batchResponse[$requestId])) {
                mtrace("  - No status returned for request_id {$requestId}, will retry later.");
                continue;
            }

            $statusResponse = $batchResponse[$requestId];

            try {
                $this->processContentStatus($content, $statusResponse);
            } catch (\Exception $e) {
                mtrace("  - Error processing content {$content->id}: " . $e->getMessage());
                // Continue with next item
            }
        }

        mtrace("poll_content_status_task completed.");
    }

    /**
     * Make a single POST to the batch status endpoint.
     *
     * Endpoint: POST https://demo.arina.ai/dev2230/agents/arina-message-bus-status-service/status/batch
     * Body:    {"request_ids": ["uuid1", "uuid2", ...]}
     * Response: flat map of { "uuid1": { status, pptx_url, ... }, "uuid2": { ... }, ... }
     *
     * @param  string[] $requestIds  Array of request UUID strings
     * @return array|null            Flat map keyed by request_id, or null on failure
     */
    private function checkBatchBackendStatus(array $requestIds)
    {
        $result = null;
        $url  = LECTUREBOT_API_CHECK_STATUS_BATCH;
        $body = json_encode(['request_ids' => $requestIds]);

        // Get API Key from settings
        $apiKey = get_config('local_lecturebot', 'api_key');

        $ch = curl_init($url);
        if ($ch === false) {
            mtrace("  - Failed to initialize cURL for batch request");
            return $result;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-API-key: ' . $apiKey
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response   = curl_exec($ch);
        $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrno  = curl_errno($ch);
        $curlError  = curl_error($ch);

        curl_close($ch);

        if ($curlErrno) {
            mtrace("  - cURL error on batch request: " . $curlError);
        } elseif ($httpCode !== 200) {
            mtrace("  - HTTP error on batch request: {$httpCode}");
        } elseif (empty($response)) {
            mtrace("  - Empty response from batch endpoint");
        } else {
            $decoded = json_decode($response, true);
            if (!is_array($decoded)) {
                mtrace("  - Invalid JSON from batch endpoint");
            } else {
                $result = $decoded;
            }
        }

        return $result; // flat map: { "request_id" => { ...status... }, ... }
    }

    /**
     * Process a single content item given its pre-fetched status response.
     *
     * @param object $content        DB record from local_lecturebot_content
     * @param array  $statusResponse Status data from the batch response for this request_id
     */
    private function processContentStatus($content, array $statusResponse)
    {
        $requestId = $content->request_id;
        $status    = $statusResponse['status'] ?? 'unknown';

        mtrace("  - Content {$content->id} (request_id: {$requestId}): status = {$status}");

        switch ($status) {
            // Final completion statuses — trigger file download
            case 'completed':
            case 'success':
            case 'slides_completed':    // PPTX/slides are ready
            case 'content_completed':   // Alternative completion status
            case 'video_completed':     // Video generation completed
                $this->handleCompleted($content, $statusResponse);
                break;

            case 'failed':
            case 'error':
                $this->handleFailed($content, $statusResponse);
                break;

            // Intermediate milestones — save progress, keep waiting
            case 'toc_completed':       // TOC done, lecture generation started
            case 'lecture_completed':   // Lecture done, slide generation started
            case 'audio_completed':     // Audio done (for video)
                $this->updateLastChecked($content, $status);
                mtrace("    Milestone reached ({$status}), waiting for completion...");
                break;

            // Still actively processing
            case 'processing':
            case 'queued':
            case 'pending':
            case 'toc_generation':
            case 'lecture_generation':
            case 'slides_generation':
                $this->updateLastChecked($content, $status);
                mtrace("    Still processing ({$status}), will check again later.");
                break;

            default:
                mtrace("    Unknown status: {$status}, will retry later.");
                break;
        }
    }

    /**
     * Handle completed content generation — download from Azure and update DB.
     */
    private function handleCompleted($content, $statusResponse)
    {
        global $DB, $CFG;

        mtrace("    Content generation completed! Downloading from Azure...");

        $generationData = json_decode($content->generationdata, true) ?: [];
        $isVideo        = $generationData['is_video'] ?? false;

        $containerName = $generationData['azure_container'] ?? null;
        $folderName    = $generationData['azure_folder'] ?? null;

        // Extract IDs from folder name
        preg_match('/Tutorial_(\d+)_(\d+)_(\d+)/', $folderName ?? '', $matches);
        $courseid  = $matches[1] ?? $content->courseid;
        $sectionid = $matches[2] ?? $content->sectionid;

        $localFileName = $isVideo
            ? 'video_' . $content->id . '_' . time() . '.mp4'
            : 'slides_' . $content->id . '_' . time() . '.pptx';

        // Resolve blob info from status response
        $blobInfo = $this->resolveBlobInfo(
            $statusResponse,
            $isVideo,
            $folderName,
            $containerName,
            $courseid,
            $sectionid
        );
        $blobName = $blobInfo['name'];
        $blobUrl  = $blobInfo['url'];

        $filepath = $CFG->tempdir . '/lecturebot/' . $localFileName;

        if (!is_dir($CFG->tempdir . '/lecturebot')) {
            mkdir($CFG->tempdir . '/lecturebot', 0755, true);
        }

        // Extract blob name from URL if available (authenticated Azure download)
        if ($blobUrl) {
            $blobName = \local_lecturebot\Utils::extractBlobNameFromUrl($blobUrl);
            mtrace("    Extracted blob name from URL: {$blobName}");
        }

        $success = \local_lecturebot\Utils::downloadFileFromAzure($blobName, $filepath, $containerName);

        if (!$success || !file_exists($filepath) || filesize($filepath) === 0) {
            throw new \local_lecturebot\exception\azure_download_exception(
                "Failed to download file from Azure: {$blobName}"
            );
        }

        mtrace("    Downloaded file: {$localFileName} (" . filesize($filepath) . " bytes)");

        $fileDetails = ['path' => $filepath, 'name' => $localFileName];
        $context     = ['isVideo' => $isVideo, 'courseid' => $courseid, 'sectionid' => $sectionid];

        $this->updateContentOnSuccess($content, $generationData, $blobName, $statusResponse, $fileDetails, $context);
    }

    /**
     * Handle failed content generation — mark as error in DB.
     */
    private function handleFailed($content, $statusResponse)
    {
        global $DB;

        $errorMessage = $statusResponse['error'] ?? $statusResponse['message'] ?? 'Unknown error from backend';
        mtrace("    Content generation failed: {$errorMessage}");

        $content->status       = 'error';
        $content->errormessage = $errorMessage;
        $content->timemodified = time();

        $generationData = json_decode($content->generationdata, true) ?: [];
        $generationData['backend_error_response'] = $statusResponse;
        $content->generationdata = json_encode($generationData);

        $DB->update_record('local_lecturebot_content', $content);
    }

    /**
     * Persist the updated generation data and bump timemodified.
     */
    private function updateContentOnSuccess($content, $genData, $blobName, $resp, $fileDetails, $context)
    {
        global $DB, $CFG;

        $fpath     = $fileDetails['path'];
        $localName = $fileDetails['name'];
        $isVideo   = $context['isVideo'];
        $cid       = $context['courseid'];
        $sid       = $context['sectionid'];

        $genDataUpdate = [
            'completed_at'           => time(),
            'azure_blob_name'        => $blobName,
            'backend_status_response'=> $resp,
        ];

        if ($isVideo) {
            $genDataUpdate['video_file'] = $localName;
            $genDataUpdate['video_path'] = $fpath;
            $genDataUpdate['video_size'] = filesize($fpath);
            $genDataUpdate['result']     = [
                'status'  => 'success',
                'results' => [[
                    'topic'         => "Section " . $sid,
                    'videoUrl'      => "{$CFG->wwwroot}/local/lecturebot/api/stream_video.php?" .
                                       "contentid={$content->id}&courseid={$cid}",
                    'videoDuration' => 0
                ]]
            ];
        } else {
            $slideCount = \local_lecturebot\Utils::countSlidesInPptx($fpath);
            $genDataUpdate['pptx_file']   = $localName;
            $genDataUpdate['pptx_path']   = $fpath;
            $genDataUpdate['slide_count'] = $slideCount;
            $genDataUpdate['result']      = [
                'status'  => 'success',
                'results' => [[
                    'topic'      => "Section " . $sid,
                    'slideCount' => $slideCount,
                    'pptxFile'   => $localName
                ]]
            ];
            mtrace("    Slide count: {$slideCount}");
        }

        $content->status         = 'ready';
        $content->generationdata = json_encode(array_merge($genData, $genDataUpdate));
        $content->timemodified   = time();
        $DB->update_record('local_lecturebot_content', $content);
        mtrace("    Content {$content->id} marked as ready!");
    }

    /**
     * Determine which Azure blob to download from the status response.
     */
    private function resolveBlobInfo($statusResponse, $isVideo, $folderName, $containerName, $courseid, $sectionid)
    {
        $blobUrl  = null;
        $blobName = null;

        if ($isVideo) {
            $blobUrl = $statusResponse['video_url'] ?? $statusResponse['videoUrl'] ?? null;
        } else {
            $blobUrl = $statusResponse['pptx_url'] ?? $statusResponse['pptxUrl'] ?? null;
        }

        if ($blobUrl) {
            mtrace("    Using URL from backend response: {$blobUrl}");
            $blobName = \local_lecturebot\Utils::extractBlobNameFromUrl($blobUrl);
        } else {
            if (!$containerName || !$folderName) {
                throw new \local_lecturebot\exception\api_response_exception(
                    "Missing Azure container/folder info in generation data and no URL in response"
                );
            }
            // Fallback: construct blob path from generation metadata
            $remoteFileName = $isVideo
                ? "video_tutorial_{$courseid}_{$sectionid}.mp4"
                : "slide_tutorial_{$courseid}_{$sectionid}.pptx";

            $blobName = $folderName . '/' . $remoteFileName;
            mtrace("    Constructed blob path: {$blobName}");
        }

        return ['name' => $blobName, 'url' => $blobUrl];
    }

    /**
     * Update last-checked timestamp and intermediate processing_status in generation data.
     */
    private function updateLastChecked($content, $status = null)
    {
        global $DB;

        $generationData = json_decode($content->generationdata, true) ?: [];
        if ($status) {
            $generationData['processing_status'] = $status;
        }

        $DB->update_record('local_lecturebot_content', (object)[
            'id'             => $content->id,
            'generationdata' => json_encode($generationData),
            'timemodified'   => time()
        ]
    );
    }
}
