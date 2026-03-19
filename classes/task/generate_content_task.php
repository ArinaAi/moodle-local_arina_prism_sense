<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');
require_once(__DIR__ . '/../../api/cms/CreditServiceClient.php');
require_once(__DIR__ . '/../CompanyConfig.php');

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

        $taskData = $this->initializeTaskData();
        $contentId = $taskData['contentId'];

        try {
            $content = $DB->get_record('local_lecturebot_content', ['id' => $contentId]);
            if (!$content) {
                mtrace("Content record $contentId not found, aborting.");
                return;
            }

            // Skip trigger_generation for:
            // 1. Feedback-based regenerations — detected via parent_content_id > 0.
            //    NOTE: we cannot use $taskData['data']->feedback because save_content_feedback.php
            //    stores feedback in the external Arina service, not local_lecturebot_feedback,
            //    so feedbackDetails is always null here. parent_content_id is the reliable signal.
            // 2. Video generation — trigger_generation doesn't support video params
            //    (language, voice_gender, avatar_strategy); use generate_video directly.
            $isRegeneration = !empty($taskData['data']->parent_content_id) &&
                ((int) $taskData['data']->parent_content_id) > 0;
            $isVideo = ($taskData['contentType'] === 'video' || $taskData['avatarVideoNeeded'] === 'yes');

            if (!$isRegeneration && !$isVideo && $this->handleNewWorkflow($taskData)) {
                return;
            }

            $this->handleLegacyWorkflow($content, $taskData);

        } catch (\Exception $e) {
            mtrace("Error generating content: " . $e->getMessage());
            $this->handleFailure($contentId, $e->getMessage());
        }
    }

    /**
     * Initialize and validate task data
     *
     * @return array Initialized task data
     */
    private function initializeTaskData()
    {
        $data = $this->get_custom_data();

        // Fix: Ensure data is an object, as get_custom_data() might return an array
        if (is_array($data)) {
            $data = (object) $data;
        }

        mtrace("Task Custom Data: " . json_encode($data));

        $contentId = $data->content_id;
        $contentType = isset($data->content_type) ? $data->content_type : 'slides';
        $avatarVideoNeeded = isset($data->avtar_video_needed) ? $data->avtar_video_needed : 'no';

        // Bootstrap per-tenant config using the originating teacher's user ID.
        // In cron context $USER->id is the CLI user; task data carries the real user.
        if (!empty($data->user_id)) {
            \local_lecturebot\CompanyConfig::bootstrap((int)$data->user_id);
        }

        $userUuid = $this->getUserUuidForCredit($data);
        mtrace("User UUID for credit tracking: " .
            ($userUuid ? $userUuid : 'NULL - user may not have wallet allocated'));

        mtrace("Starting content generation for content ID: $contentId. Type: $contentType");

        return [
            'data' => $data,
            'contentId' => $contentId,
            'contentType' => $contentType,
            'avatarVideoNeeded' => $avatarVideoNeeded,
            'userUuid' => $userUuid
        ];
    }

    /**
     * Handle new workflow with polling
     *
     * @param array $taskData Initialized task data
     * @return bool True if new workflow was successful, false to fallback to legacy
     */
    private function handleNewWorkflow($taskData)
    {
        $requestId = $this->triggerGenerationWithPolling($taskData['data'], $taskData['userUuid']);

        if (!$requestId) {
            mtrace("Trigger generation returned no request_id, falling back to old workflow...");
            return false;
        }

        mtrace("Generation triggered successfully. Request ID: $requestId");
        $this->storeRequestId(
            $taskData['contentId'],
            $requestId,
            $taskData['data'],
            $taskData['contentType'],
            $taskData['avatarVideoNeeded']
        );
        mtrace("Content {$taskData['contentId']} queued for async generation. " .
            "Polling task will check for completion.");
        return true;
    }

    /**
     * Handle legacy workflow
     *
     * @param object $content Content record
     * @param array $taskData Initialized task data
     */
    private function handleLegacyWorkflow($content, $taskData)
    {
        $apiUrl = $this->getApiUrl(
            $taskData['data'],
            $taskData['contentType'],
            $taskData['avatarVideoNeeded'],
            $taskData['userUuid']
        );
        mtrace("Calling API URL: $apiUrl");

        $apiResponse = $this->executeApiCall($apiUrl);
        $this->processApiResponse($content, $apiResponse, $taskData);
    }

    /**
     * Process API response from legacy workflow
     *
     * @param object $content Content record
     * @param array $apiResponse API response
     * @param array $taskData Initialized task data
     */
    private function processApiResponse($content, $apiResponse, $taskData)
    {
        if ($this->isAsyncResponse($apiResponse)) {
            $this->handleAsyncResponse($apiResponse, $taskData);
        } elseif ($this->isApiSuccess($apiResponse)) {
            $this->handleSyncResponse($content, $taskData);
        } else {
            $errorMsg = $this->extractErrorMessage($apiResponse);
            throw new \local_lecturebot\exception\api_response_exception($errorMsg);
        }
    }

    /**
     * Handle asynchronous API response
     *
     * @param array $apiResponse API response
     * @param array $taskData Initialized task data
     */
    private function handleAsyncResponse($apiResponse, $taskData)
    {
        $requestId = $apiResponse['request_id'] ?? $apiResponse['content_request_id'] ?? null;

        if (!$requestId) {
            throw new \local_lecturebot\exception\api_response_exception(
                'API returned processing status but no request_id'
            );
        }

        mtrace("Backend accepted request. Request ID: $requestId, Status: " .
            ($apiResponse['status'] ?? 'unknown'));

        $this->storeRequestId(
            $taskData['contentId'],
            $requestId,
            $taskData['data'],
            $taskData['contentType'],
            $taskData['avatarVideoNeeded']
        );

        mtrace("Content {$taskData['contentId']} queued for async generation. " .
            "Polling task will check for completion.");
    }

    /**
     * Handle synchronous API response
     *
     * @param object $content Content record
     * @param array $taskData Initialized task data
     */
    private function handleSyncResponse($content, $taskData)
    {
        mtrace("Backend API returned synchronous success, fetching file from Azure Blob Storage");
        $this->processSuccess(
            $content,
            $taskData['data'],
            $taskData['contentType'],
            $taskData['avatarVideoNeeded']
        );
        mtrace("Content {$taskData['contentId']} ({$taskData['contentType']}) generated successfully.");
    }

    /**
     * Extract error message from API response
     *
     * @param array $apiResponse API response
     * @return string Error message
     */
    private function extractErrorMessage($apiResponse)
    {
        $errorMsg = 'Generation failed';

        if (isset($apiResponse['message'])) {
            $errorMsg = is_string($apiResponse['message'])
                ? $apiResponse['message']
                : json_encode($apiResponse['message']);
        } elseif (isset($apiResponse['error'])) {
            $errorMsg = is_string($apiResponse['error'])
                ? $apiResponse['error']
                : json_encode($apiResponse['error']);
        } elseif (isset($apiResponse['detail'])) {
            $errorMsg = is_string($apiResponse['detail'])
                ? $apiResponse['detail']
                : json_encode($apiResponse['detail']);
        }

        return $errorMsg;
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
     * Trigger generation with polling to ensure PDFs are processed
     *
     * This method calls the /trigger_generation endpoint which checks if PDFs
     * are processed before starting generation. Polls until content_request_id
     * is received or one of the abort conditions is met:
     *   - Content record deleted mid-poll (orphaned task)
     *   - Backend reports uploads not complete for MAX_UPLOAD_WAIT_ATTEMPTS consecutive polls
     *   - Hard wall-clock timeout elapsed
     *
     * @param object $data Task custom data
     * @param string|null $userUuid User's owner UUID for credit tracking
     * @return string|null The content_request_id or null if failed
     */
    private function triggerGenerationWithPolling($data, $userUuid = null)
    {
        global $DB;

        $batchId = $this->getBatchIdFromSources($data->course_id, $data->section_id);
        if (empty($batchId)) {
            return null;
        }

        mtrace("Found batch_id: $batchId");

        $apiKey = \local_lecturebot\CompanyConfig::getApiKey()
            ?? get_config('local_lecturebot', 'api_key');
        if (empty($apiKey)) {
            throw new \local_lecturebot\exception\api_http_exception('API key is not configured');
        }

        // Polling configuration and mutable state bundled together
        $pollCfg = [
            'maxAttempts'           => 60,       // absolute maximum (60 × 60 s = 60 min)
            'pollInterval'          => 60,       // seconds between each poll
            'maxUploadWaitAttempts' => 10,       // consecutive "uploads not ready" before abort
            'hardTimeoutSeconds'    => 20 * 60,  // 20-minute absolute wall-clock limit
            'uploadNotReadyCount'   => 0,        // mutable: updated each iteration
            'startTime'             => time(),   // mutable: wall-clock anchor
        ];

        mtrace("Starting trigger_generation polling (max {$pollCfg['maxAttempts']} attempts, " .
            "{$pollCfg['pollInterval']}s interval, " .
            "upload-not-ready limit: {$pollCfg['maxUploadWaitAttempts']}, hard timeout: " .
            ($pollCfg['hardTimeoutSeconds'] / 60) . " min)");

        for ($attempt = 1; $attempt <= $pollCfg['maxAttempts']; $attempt++) {
            $pollCfg['elapsed'] = time() - $pollCfg['startTime'];
            $iterResult = $this->runPollIteration($data, $batchId, $apiKey, $userUuid, $attempt, $pollCfg);

            if ($iterResult === false) {
                // Transient failure — reset counter and continue
                $pollCfg['uploadNotReadyCount'] = 0;
                continue;
            }

            if (is_int($iterResult)) {
                // Uploads not ready — updated counter, keep looping
                $pollCfg['uploadNotReadyCount'] = $iterResult;
                continue;
            }

            // null → abort; string → success (content_request_id)
            return $iterResult;
        }

        mtrace("✗ Failed to get content_request_id after {$pollCfg['maxAttempts']} attempts");
        return null;
    }

    /**
     * Execute a single poll iteration of trigger_generation.
     *
     * Return values:
     *   - string : content_request_id — generation successfully triggered
     *   - null   : abort the polling loop (timeout / orphan / upload limit)
     *   - int    : new uploadNotReadyCount — uploads pending, keep looping
     *   - false  : transient failure — caller resets counter and keeps looping
     *
     * @param object      $data
     * @param string      $batchId
     * @param string      $apiKey
     * @param string|null $userUuid
     * @param int         $attempt
     * @param array       $pollCfg  Keys: maxAttempts, pollInterval, maxUploadWaitAttempts,
     *                              hardTimeoutSeconds, elapsed, uploadNotReadyCount, startTime
     * @return string|null|int|false
     */
    private function runPollIteration($data, $batchId, $apiKey, $userUuid, $attempt, array $pollCfg)
    {
        // Guards 1 & 2: timeout / orphan — abort immediately
        if ($this->checkAbortConditions($data, $pollCfg) !== null) {
            return null;
        }

        $maxAttempts  = $pollCfg['maxAttempts'];
        $pollInterval = $pollCfg['pollInterval'];
        $elapsed      = $pollCfg['elapsed'];

        mtrace("Attempt $attempt/$maxAttempts (elapsed: {$elapsed}s): Calling trigger_generation...");

        $params       = $this->buildTriggerParams($data, $batchId, $userUuid);
        $responseData = $this->callTriggerGenerationApi($params, $apiKey);

        // null response = transient failure; delegate all other outcomes then sleep once
        $iterReturn = ($responseData === null)
            ? false
            : $this->resolveIterationResult($responseData, $pollCfg, $pollInterval);

        sleep($pollInterval);
        return $iterReturn;
    }

    /**
     * Resolve the outcome of a successful API response.
     *
     * @param array $responseData
     * @param array $pollCfg
     * @param int   $pollInterval
     * @return string|null|int|false
     */
    private function resolveIterationResult(array $responseData, array $pollCfg, $pollInterval)
    {
        $result = $this->processTriggerResponse($responseData);

        if ($result !== 'UPLOADS_NOT_READY') {
            return $result; // string (success) or false (transient error)
        }

        return $this->handleUploadsNotReady(
            $pollCfg['uploadNotReadyCount'],
            $pollCfg['maxUploadWaitAttempts'],
            $pollInterval
        );
    }

    /**
     * Check whether the polling loop should be aborted.
     *
     * Returns a non-null reason string if the loop must stop, or null if it may proceed.
     *
     * @param object $data
     * @param array  $pollCfg
     * @return string|null  Reason message on abort, null when safe to proceed
     */
    private function checkAbortConditions($data, array $pollCfg)
    {
        global $DB;

        if ($pollCfg['elapsed'] >= $pollCfg['hardTimeoutSeconds']) {
            mtrace("✗ Hard timeout reached after {$pollCfg['elapsed']}s. Aborting poll.");
            return 'timeout';
        }

        if (!$DB->record_exists('local_lecturebot_content', ['id' => $data->content_id])) {
            mtrace("✗ Content record {$data->content_id} no longer exists. Aborting orphaned poll.");
            return 'orphan';
        }

        return null;
    }

    /**
     * Handle an "uploads not ready" poll result.
     *
     * @param int $uploadNotReadyCount
     * @param int $maxUploadWaitAttempts
     * @param int $pollInterval
     * @return int|null  Updated counter (keep looping) or null (abort)
     */
    private function handleUploadsNotReady($uploadNotReadyCount, $maxUploadWaitAttempts, $pollInterval)
    {
        $uploadNotReadyCount++;
        mtrace("  ⏳ Uploads not ready (consecutive count: $uploadNotReadyCount/$maxUploadWaitAttempts)");

        if ($uploadNotReadyCount >= $maxUploadWaitAttempts) {
            mtrace("✗ Uploads did not complete after $maxUploadWaitAttempts consecutive attempts. " .
                "The backend may have lost the batch. Aborting.");
            return null;
        }

        sleep($pollInterval);
        return $uploadNotReadyCount;
    }

    /**
     * Get batch_id from sources table
     *
     * @param int $courseid Course ID
     * @param int $sectionid Section ID
     * @return string|null Batch ID or null if not found
     */
    private function getBatchIdFromSources($courseid, $sectionid)
    {
        global $DB;

        // Get the most recently uploaded source that has a batch_id.
        // If multiple PDFs were uploaded one-at-a-time (each getting their own batch_id),
        // we must use the LAST one. The backend's trigger_generation endpoint uses the
        // latest batch_id to determine whether ALL uploads in the section are processed.
        // Using an earlier batch_id would cause generation to fire before the last PDF finishes.
        $sources = $DB->get_records_select(
            'local_lecturebot_sources',
            'courseid = :courseid AND sectionid = :sectionid AND batch_id IS NOT NULL AND batch_id <> :empty',
            ['courseid' => $courseid, 'sectionid' => $sectionid, 'empty' => ''],
            'timecreated DESC',
            'id, batch_id, timecreated',
            0,
            1
        );

        if (empty($sources)) {
            mtrace("No batch_id found in sources for course $courseid section $sectionid. " .
                "Skipping trigger_generation workflow.");
            return null;
        }

        $latest = reset($sources);
        mtrace("Using latest batch_id '{$latest->batch_id}' from most recently uploaded PDF " .
            "(source ID: {$latest->id}).");
        return $latest->batch_id;
    }

    /**
     * Build parameters for trigger_generation API call
     *
     * @param object $data Task custom data
     * @param string $batchId Batch ID
     * @param string|null $userUuid User's owner UUID
     * @return array API parameters
     */
    private function buildTriggerParams($data, $batchId, $userUuid)
    {
        $params = [
            'batch_id' => $batchId,
            'curriculum_text' => $data->curriculum_text,
            'regen_count' => $data->regen_count,
            'video_length' => $data->video_length,
            'content_strategy' => $data->content_strategy
        ];

        if ($userUuid) {
            $params['user_id'] = $userUuid;
        }

        return $params;
    }

    /**
     * Call trigger_generation API
     *
     * @param array $params API parameters
     * @param string $apiKey API key
     * @return array|null Response data or null on error
     */
    private function callTriggerGenerationApi($params, $apiKey)
    {
        $apiUrl = LECTUREBOT_API_TRIGGER_GENERATION . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'X-Api-Key: ' . $apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            mtrace("cURL error: $curlError");
            return null;
        }

        // Validate HTTP response and parse JSON
        $responseData = null;
        if ($httpCode !== 200) {
            mtrace("HTTP $httpCode response: $response");
        } else {
            $responseData = json_decode($response, true);
            if (!$responseData) {
                mtrace("Failed to parse JSON response");
            } else {
                mtrace("Response: " . json_encode($responseData));
            }
        }

        return $responseData;
    }

    /**
     * Process trigger_generation API response
     *
     * @param array $responseData API response data
     * @return string|'UPLOADS_NOT_READY'|false
     *   - string: the content_request_id (success)
     *   - 'UPLOADS_NOT_READY': backend confirmed uploads incomplete (counted toward abort limit)
     *   - false: transient/unknown state (does NOT count toward abort limit)
     */
    private function processTriggerResponse($responseData)
    {
        $status = $responseData['status'] ?? 'unknown';
        $contentRequestId = $responseData['content_request_id'] ?? null;

        // Check for successful generation trigger
        if ($status === 'generation_triggered' && !empty($contentRequestId)) {
            $this->logSuccessfulTrigger($contentRequestId, $responseData);
            return $contentRequestId;
        }

        // Handle failed status — throws, so never returns
        if ($this->isFailedStatus($status)) {
            $this->handleTriggerFailure($responseData);
        }

        // Log current upload state
        $this->logUploadStatus($responseData, $status);

        // Distinguish "backend explicitly says uploads not done" from any other state
        $allUploadsCompleted = $responseData['all_uploads_completed'] ?? false;
        if (!$allUploadsCompleted) {
            return 'UPLOADS_NOT_READY';
        }

        return false; // uploads done but trigger not fired yet — retry without counting
    }

    /**
     * Check if status indicates failure
     *
     * @param string $status Status value
     * @return bool True if status is failed or error
     */
    private function isFailedStatus($status)
    {
        return $status === 'failed' || $status === 'error';
    }

    /**
     * Handle trigger generation failure
     *
     * @param array $responseData Response data
     * @throws \local_lecturebot\exception\api_response_exception
     */
    private function handleTriggerFailure($responseData)
    {
        $errorMsg = $this->extractErrorMessage($responseData);
        mtrace("✗ FAILED: $errorMsg");
        throw new \local_lecturebot\exception\api_response_exception($errorMsg);
    }

    /**
     * Log successful trigger
     *
     * @param string $contentRequestId Content request ID
     * @param array $responseData Response data
     */
    private function logSuccessfulTrigger($contentRequestId, $responseData)
    {
        mtrace("✓ SUCCESS! Generation triggered with content_request_id: $contentRequestId");
        mtrace("  - all_uploads_completed: " .
            ($responseData['all_uploads_completed'] ? 'true' : 'false'));
        mtrace("  - should_trigger_generation: " .
            ($responseData['should_trigger_generation'] ? 'true' : 'false'));
        mtrace("  - message: " . ($responseData['message'] ?? 'N/A'));
    }

    /**
     * Log upload status
     *
     * @param array $responseData Response data
     * @param string $status Status
     */
    private function logUploadStatus($responseData, $status)
    {
        $allUploadsCompleted = $responseData['all_uploads_completed'] ?? false;
        $shouldTrigger = $responseData['should_trigger_generation'] ?? false;

        mtrace("  - all_uploads_completed: " . ($allUploadsCompleted ? 'true' : 'false'));
        mtrace("  - should_trigger_generation: " . ($shouldTrigger ? 'true' : 'false'));
        mtrace("  - status: $status");

        if (!$allUploadsCompleted) {
            mtrace("  ⏳ PDFs still being processed...");
        } elseif (!$shouldTrigger) {
            mtrace("  ⚠️ Uploads complete but generation not triggered — retrying...");
        } else {
            mtrace("  ⚠️ Unexpected state — retrying...");
        }
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
                $fb = is_array($data->feedback) ? $data->feedback : (array) $data->feedback;
                $feedbackJson = json_encode([
                    'topics_needing_depth' => $fb['topics_needing_depth'] ?? [],
                    'topics_overexplained' => $fb['topics_overexplained'] ?? [],
                    'extra_topics' => $fb['extra_topics'] ?? [],
                    'missing_subtopics' => $fb['missing_subtopics'] ?? [],
                    'reordered_flow' => $fb['reordered_flow'] ?? [],
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
        $apiKey = \local_lecturebot\CompanyConfig::getApiKey()
            ?? get_config('local_lecturebot', 'api_key');
        $ch = $this->initializeCurl($apiUrl, $apiKey);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        $this->checkCurlErrors($ch);
        curl_close($ch);

        mtrace("API response code: $httpCode");

        return $this->processApiCallResponse($httpCode, $response);
    }

    /**
     * Initialize cURL with required options
     *
     * @param string $apiUrl API URL
     * @param string $apiKey API key
     * @return resource cURL handle
     * @throws \local_lecturebot\exception\curl_init_exception
     */
    private function initializeCurl($apiUrl, $apiKey)
    {
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

        return $ch;
    }

    /**
     * Check for cURL errors and throw exception if found
     *
     * @param resource $ch cURL handle
     * @throws \local_lecturebot\exception\curl_execution_exception
     */
    private function checkCurlErrors($ch)
    {
        if (curl_errno($ch)) {
            $curlError = curl_error($ch);
            curl_close($ch);
            throw new \local_lecturebot\exception\curl_execution_exception('cURL error: ' . $curlError);
        }
    }

    /**
     * Process API call response based on HTTP code
     *
     * @param int $httpCode HTTP status code
     * @param string $response Response body
     * @return array Decoded JSON response
     * @throws \local_lecturebot\exception\api_http_exception
     */
    private function processApiCallResponse($httpCode, $response)
    {
        if ($httpCode === 401) {
            $this->handleAuthenticationError();
        }

        if ($httpCode === 200 && !empty($response)) {
            return json_decode($response, true);
        }

        $this->handleApiError($httpCode, $response);
    }

    /**
     * Handle authentication error (401)
     *
     * @throws \local_lecturebot\exception\api_http_exception
     */
    private function handleAuthenticationError()
    {
        mtrace("API authentication failed: HTTP 401 (API key is missing or incorrect)");
        throw new \local_lecturebot\exception\api_http_exception('API key is missing or incorrect.
            Please check your settings.');
    }

    /**
     * Handle API error response
     *
     * @param int $httpCode HTTP status code
     * @param string $response Response body
     * @throws \local_lecturebot\exception\api_http_exception
     */
    private function handleApiError($httpCode, $response)
    {
        $errorMsg = 'API returned HTTP ' . $httpCode;

        if (!empty($response)) {
            $responseData = json_decode($response, true);
            if ($responseData) {
                $errorMsg = $this->extractErrorMessage($responseData);
            }
        }

        throw new \local_lecturebot\exception\api_http_exception($errorMsg);
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
            (object) [
                'id' => $contentId,
                'status' => 'error',
                'errormessage' => $errorMessage,
                'timemodified' => time()
            ]
        );
    }

    /**
     * Get user's personal wallet UUID for credit tracking.
     *
     * All users (admins and sub-users) use the same lecturebot_wallet_sub_user_id
     * preference. An admin's personal wallet is created JIT on first allocation from
     * the org wallet. If no wallet exists yet, returns null (generation still works
     * but credits won't be tracked against any specific wallet).
     *
     * @param object $data Task custom data
     * @return string|null User's personal wallet owner UUID, or null if not available
     */
    private function getUserUuidForCredit($data)
    {
        if (!isset($data->user_id)) {
            mtrace("No user_id in task data");
            return null;
        }

        mtrace("Looking up personal wallet UUID for user_id: " . $data->user_id);

        $result = null;
        try {
            $userUuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $data->user_id);

            if (!empty($userUuid)) {
                mtrace("Found personal wallet UUID: " . $userUuid);
                $result = $userUuid;
            } else {
                mtrace("No personal wallet UUID found for user {$data->user_id} — credit tracking skipped");
            }
        } catch (\Exception $e) {
            mtrace("Warning: Could not retrieve user UUID: " . $e->getMessage());
        }

        return $result;
    }

}
