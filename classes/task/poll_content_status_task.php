<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');

/**
 * Scheduled task to poll backend for content generation status
 *
 * This task runs every minute and checks the backend's /check_status endpoint
 * for all content items with status='generating'. When content is ready,
 * it downloads the file from Azure and updates the database.
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
     */
    public function execute()
    {
        global $DB, $CFG;

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

        mtrace("Found " . count($pendingContent) . " content item(s) to check.");

        foreach ($pendingContent as $content) {
            try {
                $this->checkAndProcessContent($content);
            } catch (\Exception $e) {
                mtrace("Error processing content {$content->id}: " . $e->getMessage());
                // Continue with next item
            }
        }

        mtrace("poll_content_status_task completed.");
    }

    /**
     * Check status of a single content item and process if complete
     */
    private function checkAndProcessContent($content)
    {
        global $DB, $CFG;

        $requestId = $content->request_id;
        mtrace("Checking content {$content->id} with request_id: {$requestId}");

        // Call backend check_status endpoint
        $statusResponse = $this->checkBackendStatus($requestId);

        if (!$statusResponse) {
            mtrace("  - No response from backend, will retry later.");
            return;
        }

        $status = $statusResponse['status'] ?? 'unknown';
        mtrace("  - Backend status: {$status}");

        switch ($status) {
            case 'completed':
            case 'success':
            case 'slides_completed':       // Backend returns this when PPTX is ready
            case 'lecture_completed':      // Backend returns this when lecture content is ready
            case 'content_completed':      // Alternative completion status
                $this->handleCompleted($content, $statusResponse);
                break;

            case 'failed':
            case 'error':
                $this->handleFailed($content, $statusResponse);
                break;

            case 'processing':
            case 'queued':
            case 'pending':
            case 'toc_generation':         // TOC generation phase
            case 'lecture_generation':     // Lecture content generation phase
            case 'slides_generation':      // Slides generation phase
                // Still processing, just log and wait
                $this->updateLastChecked($content);
                mtrace("  - Still processing, will check again later.");
                break;

            default:
                mtrace("  - Unknown status: {$status}, will retry later.");
                break;
        }
    }

    /**
     * Call backend /check_status endpoint
     */
    private function checkBackendStatus($requestId)
    {
        $url = LECTUREBOT_API_CHECK_STATUS . '?request_id=' . urlencode($requestId);

        $ch = curl_init($url);
        if ($ch === false) {
            mtrace("  - Failed to initialize cURL");
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json'
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrno = curl_errno($ch);
        $curlError = curl_error($ch);

        curl_close($ch);

        $result = null;

        if ($curlErrno) {
            mtrace("  - cURL error: " . $curlError);
        } elseif ($httpCode !== 200) {
            mtrace("  - HTTP error: {$httpCode}");
        } elseif (empty($response)) {
            mtrace("  - Empty response from backend");
        } else {
            $result = json_decode($response, true);
        }

        return $result;
    }

    /**
     * Handle completed content generation
     */
    private function handleCompleted($content, $statusResponse)
    {
        global $DB, $CFG;

        mtrace("  - Content generation completed! Downloading from Azure...");

        $generationData = json_decode($content->generationdata, true) ?: [];
        $isVideo = $generationData['is_video'] ?? false;

        $containerName = $generationData['azure_container'] ?? null;
        $folderName = $generationData['azure_folder'] ?? null;

        // Extract IDs from folder name
        preg_match('/Tutorial_(\d+)_(\d+)_(\d+)/', $folderName ?? '', $matches);
        $courseid = $matches[1] ?? $content->courseid;
        $sectionid = $matches[2] ?? $content->sectionid;

        $localFileName = $isVideo
            ? 'video_' . $content->id . '_' . time() . '.mp4'
            : 'slides_' . $content->id . '_' . time() . '.pptx';

        // Resolve Blob Info
        $blobInfo = $this->resolveBlobInfo(
            $statusResponse,
            $isVideo,
            $folderName,
            $containerName,
            $courseid,
            $sectionid
        );
        $blobName = $blobInfo['name'];
        $blobUrl = $blobInfo['url'];

        $filepath = $CFG->tempdir . '/lecturebot/' . $localFileName;

        if (!is_dir($CFG->tempdir . '/lecturebot')) {
            mkdir($CFG->tempdir . '/lecturebot', 0755, true);
        }

        // Download file
        $success = $blobUrl
            ? \local_lecturebot\Utils::downloadFileFromUrl($blobUrl, $filepath)
            : \local_lecturebot\Utils::downloadFileFromAzure($blobName, $filepath, $containerName);

        if (!$success || !file_exists($filepath) || filesize($filepath) === 0) {
            throw new \local_lecturebot\exception\azure_download_exception(
                "Failed to download file from Azure: {$blobName}"
            );
        }

        mtrace("  - Downloaded file: {$localFileName} (" . filesize($filepath) . " bytes)");

        // Update DB
        $fileDetails = [
            'path' => $filepath,
            'name' => $localFileName
        ];
        $context = [
            'isVideo' => $isVideo,
            'courseid' => $courseid,
            'sectionid' => $sectionid
        ];

        $this->updateContentOnSuccess(
            $content,
            $generationData,
            $blobName,
            $statusResponse,
            $fileDetails,
            $context
        );
    }

    /**
     * Handle failed content generation
     */
    private function handleFailed($content, $statusResponse)
    {
        global $DB;

        $errorMessage = $statusResponse['error'] ?? 'Unknown error from backend';
        mtrace("  - Content generation failed: {$errorMessage}");

        $content->status = 'error';
        $content->errormessage = $errorMessage;
        $content->timemodified = time();

        // Store the full status response in generation data for debugging
        $generationData = json_decode($content->generationdata, true) ?: [];
        $generationData['backend_error_response'] = $statusResponse;
        $content->generationdata = json_encode($generationData);

        $DB->update_record('local_lecturebot_content', $content);
    }

    private function updateContentOnSuccess($content, $genData, $blobName, $resp, $fileDetails, $context)
    {
        global $DB, $CFG;

        $fpath = $fileDetails['path'];
        $localName = $fileDetails['name'];
        $isVideo = $context['isVideo'];
        $cid = $context['courseid'];
        $sid = $context['sectionid'];

        $genDataUpdate = [
            'completed_at' => time(),
            'azure_blob_name' => $blobName,
            'backend_status_response' => $resp,
        ];

        if ($isVideo) {
            $genDataUpdate['video_file'] = $localName;
            $genDataUpdate['video_path'] = $fpath;
            $genDataUpdate['video_size'] = filesize($fpath);
            $genDataUpdate['result'] = [
                'status' => 'success',
                'results' => [[
                    'topic' => "Section " . $sid,
                    'videoUrl' => "{$CFG->wwwroot}/local/lecturebot/api/stream_video.php?" .
                                  "contentid={$content->id}&courseid={$cid}",
                    'videoDuration' => 0
                ]]
            ];
        } else {
            $slideCount = \local_lecturebot\Utils::countSlidesInPptx($fpath);
            $genDataUpdate['pptx_file'] = $localName;
            $genDataUpdate['pptx_path'] = $fpath;
            $genDataUpdate['slide_count'] = $slideCount;
            $genDataUpdate['result'] = [
                'status' => 'success',
                'results' => [[
                    'topic' => "Section " . $sid,
                    'slideCount' => $slideCount,
                    'pptxFile' => $localName
                ]]
            ];
            mtrace("  - Slide count: {$slideCount}");
        }

        $content->status = 'ready';
        $content->generationdata = json_encode(array_merge($genData, $genDataUpdate));
        $content->timemodified = time();
        $DB->update_record('local_lecturebot_content', $content);
        mtrace("  - Content {$content->id} marked as ready!");
    }

    private function resolveBlobInfo($statusResponse, $isVideo, $folderName, $containerName, $courseid, $sectionid)
    {
        $blobUrl = null;
        $blobName = null;

        if ($isVideo) {
            $blobUrl = $statusResponse['video_url'] ?? $statusResponse['videoUrl'] ?? null;
        } else {
            $blobUrl = $statusResponse['pptx_url'] ?? $statusResponse['pptxUrl'] ?? null;
        }

        if ($blobUrl) {
            mtrace("  - Using URL from backend response: {$blobUrl}");
            $blobName = \local_lecturebot\Utils::extractBlobNameFromUrl($blobUrl);
        } else {
            if (!$containerName || !$folderName) {
                throw new \local_lecturebot\exception\api_response_exception(
                    "Missing Azure container/folder info in generation data and no URL in response"
                );
            }
            // Fallback construction
            $remoteFileName = $isVideo
                ? "video_tutorial_{$courseid}_{$sectionid}.mp4"
                : "slide_tutorial_{$courseid}_{$sectionid}.pptx";

            $blobName = $folderName . '/' . $remoteFileName;
            mtrace("  - Constructed blob path: {$blobName}");
        }

        return ['name' => $blobName, 'url' => $blobUrl];
    }

    /**
     * Update last checked timestamp (stored in timemodified)
     */
    private function updateLastChecked($content)
    {
        global $DB;

        $DB->update_record('local_lecturebot_content', (object)[
            'id' => $content->id,
            'timemodified' => time()
        ]
    );
    }


}
