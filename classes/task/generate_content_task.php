<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');
require_once(__DIR__ . '/../../api/cms/CreditServiceClient.php');

/**
 * Adhoc task to initiate content generation asynchronously via Kafka
 *
 * This task now handles the INITIAL API call which returns immediately with a request_id.
 * The actual file download is handled by the scheduled poll_content_status_task.
 *
 * @package    local_lecturebot
 * @copyright  2025
 */
class generate_content_task extends \core\task\adhoc_task
{

    /**
     * Execute the task.
     */
    public function execute()
    {
        global $DB;

        $data = $this->get_custom_data();
        
        // Fix: Ensure data is an object, as get_custom_data() might return an array
        if (is_array($data)) {
            $data = (object)$data;
        }
        
        // Debugging: Log raw input data to identify missing fields
        mtrace("Task Custom Data: " . json_encode($data));

        $contentId = $data->content_id;
        
        // Optional params for decision making
        $contentType = isset($data->content_type) ? $data->content_type : 'slides';
        $avatarVideoNeeded = isset($data->avtar_video_needed) ? $data->avtar_video_needed : 'no';

        // Get user's owner UUID for credit tracking
        $userUuid = $this->getUserUuidForCredit($data);

        mtrace("Starting content generation for content ID: $contentId. Type: $contentType");

        try {
            // Check if content still exists
            $content = $DB->get_record('local_lecturebot_content', ['id' => $contentId]);
            if (!$content) {
                mtrace("Content record $contentId not found, aborting.");
                return;
            }

            // 1. Build API URL
            $apiUrl = $this->getApiUrl($data, $contentType, $avatarVideoNeeded, $userUuid);
            mtrace("Calling API URL: $apiUrl");

            // 2. Execute API Call (now returns immediately with request_id)
            $apiResponse = $this->executeApiCall($apiUrl);

            // 3. Process Response - NEW: Handle async/Kafka response
            if ($this->isAsyncResponse($apiResponse)) {
                // Extract request_id from response
                $requestId = $apiResponse['request_id'] ?? $apiResponse['content_request_id'] ?? null;
                
                if ($requestId) {
                    mtrace("Backend accepted request. Request ID: $requestId, Status: " .
                        ($apiResponse['status'] ?? 'unknown'));
                    
                    // Store request_id in database for polling
                    $this->storeRequestId($contentId, $requestId, $data, $contentType, $avatarVideoNeeded);
                    
                    mtrace("Content $contentId queued for async generation. " .
                        "Polling task will check for completion.");
                } else {
                    throw new \local_lecturebot\exception\api_response_exception(
                        'API returned processing status but no request_id'
                    );
                }
            } elseif ($this->isApiSuccess($apiResponse)) {
                // Legacy: Synchronous success response (keeping for backwards compatibility)
                mtrace("Backend API returned synchronous success, fetching file from Azure Blob Storage");
                $this->processSuccess($content, $data, $contentType, $avatarVideoNeeded);
                mtrace("Content $contentId ($contentType) generated successfully.");
            } else {
                $errorMsg = isset($apiResponse['error']) ? $apiResponse['error'] : 'API returned unsuccessful response';
                throw new \local_lecturebot\exception\api_response_exception($errorMsg);
            }

        } catch (\Exception $e) {
            mtrace("Error generating content: " . $e->getMessage());
            $this->handleFailure($contentId, $e->getMessage());
        }
    }

    /**
     * Check if response is an async/Kafka response (processing status)
     */
    private function isAsyncResponse($apiResponse)
    {
        if (!$apiResponse) {
            return false;
        }
        
        // Check for Kafka-style response with status: "processing"
        $status = $apiResponse['status'] ?? '';
        return $status === 'processing' || $status === 'queued' || $status === 'pending';
    }

    /**
     * Store request_id in database for polling by poll_content_status_task
     */
    private function storeRequestId($contentId, $requestId, $data, $contentType, $avatarVideoNeeded)
    {
        global $DB;
        
        $tenantId = $data->tenant_id;
        $courseid = $data->course_id;
        $sectionid = $data->section_id;
        $regenCount = $data->regen_count;

        $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
        $folderName = "Tutorial_{$courseid}_{$sectionid}_{$regenCount}";
        
        $isVideo = ($contentType === 'video' || $avatarVideoNeeded === 'yes');

        // Update content record with request_id and Azure blob info
        $content = $DB->get_record('local_lecturebot_content', ['id' => $contentId]);
        if ($content) {
            $generationData = json_decode($content->generationdata, true) ?: [];
            $generationData['request_id'] = $requestId;
            $generationData['azure_container'] = $containerName;
            $generationData['azure_folder'] = $folderName;
            $generationData['is_video'] = $isVideo;
            $generationData['async_initiated_at'] = time();
            
            $content->request_id = $requestId;
            $content->generationdata = json_encode($generationData);
            $content->timemodified = time();
            $DB->update_record('local_lecturebot_content', $content);
        }
    }

    /**
     * Construct the API URL based on content type and parameters
     * @param object $data Task data
     * @param string $contentType Content type (video/slides)
     * @param string $avatarVideoNeeded Avatar video flag
     * @param string|null $userUuid User's owner UUID for credit tracking
     */
    private function getApiUrl($data, $contentType, $avatarVideoNeeded, $userUuid = null)
    {
        $tenantId = $data->tenant_id;
        $courseid = $data->course_id;
        $sectionid = $data->section_id;
        $regenCount = $data->regen_count;
        $videoLength = $data->video_length;
        $contentStrategy = $data->content_strategy;

        $language = isset($data->language) ? $data->language : 'english';
        $voiceGender = isset($data->voice_gender) ? $data->voice_gender : 'female';
        $avatarStrategy = isset($data->avatar_strategy) ? $data->avatar_strategy : 'title_only';
        $curriculumText = $data->curriculum_text;

        // Check if Video Generation is requested
        if ($contentType === 'video' || $avatarVideoNeeded === 'yes') {
             $baseUrl = LECTUREBOT_API_GENERATE_VIDEO;
             $videoUrl = $baseUrl .
                  '?course_id=' . $courseid .
                  '&organization_id=' . $tenantId .
                  '&chapter_id=' . $sectionid .
                  '&regen_count=' . $regenCount .
                  '&language=' . urlencode($language) .
                  '&voice_gender=' . urlencode($voiceGender) .
                  '&avatar_strategy=' . urlencode($avatarStrategy) .
                  '&content_strategy=' . urlencode($contentStrategy);
             
             // Add user_id for credit tracking
             if ($userUuid) {
                 $videoUrl .= '&user_id=' . urlencode($userUuid);
             }
             
             return $videoUrl;
        } else {
             // Fallback to existing PPTX endpoint logic
             $pptxUrl = LECTUREBOT_API_GENERATE_PPTX .
                  '?curriculum_text=' . urlencode(trim($curriculumText)) .
                  '&organization_id=' . urlencode($tenantId) .
                  '&course_id=' . $courseid .
                  '&chapter_id=' . $sectionid .
                  '&regen_count=' . $regenCount .
                  '&video_length=' . $videoLength .
                  '&content_strategy=' . urlencode($contentStrategy);
             
             // Add user_id for credit tracking
             if ($userUuid) {
                 $pptxUrl .= '&user_id=' . urlencode($userUuid);
             }

             // Append feedback_json if feedback data is present (regeneration with feedback)
             if (!empty($data->feedback)) {
                 $fb = is_array($data->feedback) ? $data->feedback : (array)$data->feedback;
                 $feedbackJson = json_encode([
                     'topics_needing_depth' => $fb['topics_needing_depth'] ?? [],
                     'topics_overexplained' => $fb['topics_overexplained'] ?? [],
                     'extra_topics'         => $fb['extra_topics'] ?? [],
                     'missing_subtopics'    => $fb['missing_subtopics'] ?? [],
                     'reordered_flow'       => $fb['reordered_flow'] ?? [],
                 ]);
                 $pptxUrl .= '&feedback_json=' . urlencode($feedbackJson);
                 mtrace("Appending feedback_json to PPTX API call for regeneration.");
             }

             return $pptxUrl;
        }
    }

    /**
     * Execute the cURL call to the backend API
     *
     * NOTE: With Kafka, the API returns immediately (typically within seconds).
     * Timeout reduced from 7200s to 60s.
     */
    private function executeApiCall($apiUrl)
    {
        // Get API Key from settings
        $apiKey = get_config('local_lecturebot', 'api_key');

        $ch = curl_init($apiUrl);
        if ($ch === false) {
            throw new \local_lecturebot\exception\curl_init_exception('Failed to initialize cURL');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_TCP_KEEPALIVE => 1,
            CURLOPT_TCP_KEEPIDLE => 30,
            CURLOPT_TCP_KEEPINTVL => 15,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded',
                'X-API-key: ' . $apiKey
            ],
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            $curlError = curl_error($ch);
            curl_close($ch);
            throw new \local_lecturebot\exception\curl_execution_exception('cURL error: ' . $curlError);
        }
        curl_close($ch);

        mtrace("API response code: $httpCode");

        if ($httpCode === 401) {
            mtrace("API authentication failed: HTTP 401 (API key is missing or incorrect)");
            throw new \local_lecturebot\exception\api_http_exception('API key is missing or incorrect.
            Please check your settings.');
        }

        if ($httpCode === 200 && !empty($response)) {
            return json_decode($response, true);
        }
        
        throw new \local_lecturebot\exception\api_http_exception('API returned HTTP ' . $httpCode);
    }

    /**
     * Check if API response indicates success (legacy synchronous response)
     */
    private function isApiSuccess($apiResponse)
    {
        return $apiResponse && ((isset($apiResponse['success']) && $apiResponse['success'] === true) ||
               (isset($apiResponse['Success']) && $apiResponse['Success'] === true));
    }

    /**
     * Handle successful content generation (legacy synchronous flow)
     *
     * This is kept for backwards compatibility. With Kafka, this code path
     * is typically not reached - file download is handled by poll_content_status_task.
     */
    private function processSuccess($content, $data, $contentType, $avatarVideoNeeded)
    {
        global $CFG, $DB;

        $tenantId = $data->tenant_id;
        $courseid = $data->course_id;
        $sectionid = $data->section_id;
        $regenCount = $data->regen_count;
        $contentId = $data->content_id;

        $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
        $folderName = "Tutorial_{$courseid}_{$sectionid}_{$regenCount}";
        
        $isVideo = ($contentType === 'video' || $avatarVideoNeeded === 'yes');
        
        if ($isVideo) {
            $remoteFileName = "video_tutorial_{$courseid}_{$sectionid}.mp4";
            $localFileName = 'video_' . $contentId . '_' . time() . '.mp4';
        } else {
            $remoteFileName = "slide_tutorial_{$courseid}_{$sectionid}.pptx";
            $localFileName = 'slides_' . $contentId . '_' . time() . '.pptx';
        }
        
        $blobName = $folderName . '/' . $remoteFileName;
        $filepath = $CFG->tempdir . '/lecturebot/' . $localFileName;
        
        if (!is_dir($CFG->tempdir . '/lecturebot')) {
            mkdir($CFG->tempdir . '/lecturebot', 0755, true);
        }

        $success = \local_lecturebot\Utils::downloadFileFromAzure($blobName, $filepath, $containerName);
        
        if (!$success || !file_exists($filepath) || filesize($filepath) === 0) {
            throw new \local_lecturebot\exception\azure_download_exception(
                "Failed to download file ($remoteFileName) from Azure Blob Storage (or empty file)"
            );
        }
        
        $updateData = [
            'blobName' => $blobName,
            'containerName' => $containerName,
            'folderName' => $folderName,
            'localFileName' => $localFileName,
            'filepath' => $filepath,
            'isVideo' => $isVideo,
            'sectionid' => $sectionid,
            'courseid' => $courseid,
            'contentId' => $contentId
        ];
        
        $this->updateContentRecord($content, $updateData);
    }

    /**
     * Update DB record with completion data
     */
    private function updateContentRecord($content, $updateData)
    {
        global $DB, $CFG;

        $blobName = $updateData['blobName'];
        $containerName = $updateData['containerName'];
        $folderName = $updateData['folderName'];
        $localFileName = $updateData['localFileName'];
        $filepath = $updateData['filepath'];
        $isVideo = $updateData['isVideo'];
        $sectionid = $updateData['sectionid'];
        $courseid = $updateData['courseid'];
        $contentId = $updateData['contentId'];

        $genDataUpdate = [
            'completed_at' => time(),
            'azure_blob_name' => $blobName,
            'azure_container' => $containerName,
            'azure_folder' => $folderName,
        ];
        
        if ($isVideo) {
            $genDataUpdate['video_file'] = $localFileName;
            $genDataUpdate['video_path'] = $filepath;
            $genDataUpdate['video_size'] = filesize($filepath);
            $genDataUpdate['result'] = [
                'status' => 'success',
                'results' => [
                    [
                        'topic' => "Section " . $sectionid,
                        'videoUrl' => "{$CFG->wwwroot}/local/lecturebot/api/stream_video.php?" .
                                      "contentid={$contentId}&courseid={$courseid}",
                        'videoDuration' => 0
                    ]
                ]
            ];
        } else {
            $slideCount = \local_lecturebot\Utils::countSlidesInPptx($filepath);
            $genDataUpdate['pptx_file'] = $localFileName;
            $genDataUpdate['pptx_path'] = $filepath;
            $genDataUpdate['slide_count'] = $slideCount;
            $genDataUpdate['result'] = [
                'status' => 'success',
                'results' => [
                    [
                        'topic' => "Section " . $sectionid,
                        'slideCount' => $slideCount,
                        'pptxFile' => $localFileName
                    ]
                ]
            ];
        }

        $content->status = 'ready';
        $content->generationdata = json_encode(array_merge(
            json_decode($content->generationdata, true) ?: [],
            $genDataUpdate
        ));
        $content->timemodified = time();
        $DB->update_record('local_lecturebot_content', $content);
    }

    /**
     * Handle failure by updating status to error
     */
    private function handleFailure($contentId, $errorMessage)
    {
        global $DB;
        $DB->update_record(
            'local_lecturebot_content',
            (object)[
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => $errorMessage,
                'timemodified' => time()
            ]
        );
    }

    /**
     * Get user's owner UUID for credit tracking
     *
     * @param object $data Task custom data
     * @return string|null User's owner UUID or null if not available
     */
    private function getUserUuidForCredit($data)
    {
        if (!isset($data->user_id)) {
            return null;
        }

        try {
            $client = new \local_lecturebot\cms\CreditServiceClient();
            return $client->getUserOwnerUuid($data->user_id);
        } catch (\Exception $e) {
            mtrace("Warning: Could not retrieve user UUID: " . $e->getMessage());
            return null;
        }
    }

}
