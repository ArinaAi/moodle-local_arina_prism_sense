<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
namespace local_arina_prism_sense\task;

defined('MOODLE_INTERNAL') || die();

/**
 * Trigger-generation polling logic for generate_content_task.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait TriggerGenerationTrait
{
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

        $apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key');
        if (empty($apiKey)) {
            throw new \local_arina_prism_sense\exception\api_http_exception('API key is not configured');
        }

        // Polling configuration and mutable state bundled together.
        // Total window: 180 attempts × 60 s = 180 min (3 hours).
        // The hard timeout acts as an absolute safety net for the same period.
        $pollCfg = [
            'maxAttempts'            => 180,          // 180 × 60 s = 3 hours
            'pollInterval'           => 60,            // seconds between each poll
            'maxUploadWaitAttempts'  => 10,            // consecutive "uploads not ready" before abort
            'hardTimeoutSeconds'     => 3 * 60 * 60,  // 3-hour absolute wall-clock limit
            'uploadNotReadyCount'    => 0,             // mutable: updated each iteration
            'startTime'              => time(),        // mutable: wall-clock anchor
        ];

        mtrace("Starting trigger_generation polling (max {$pollCfg['maxAttempts']} attempts, " .
            "{$pollCfg['pollInterval']}s interval, " .
            "upload-not-ready limit: {$pollCfg['maxUploadWaitAttempts']}, hard timeout: " .
            ($pollCfg['hardTimeoutSeconds'] / 3600) . " h)");

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

        mtrace("✗ Failed to get content_request_id after {$pollCfg['maxAttempts']} attempts (3-hour limit reached).");
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

        if (!$DB->record_exists('local_arina_prism_sense_content', ['id' => $data->content_id])) {
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
            // Throw with the sentinel so handleFailure() writes a recognisable
            // errormessage that the frontend can surface as a specific PDF error.
            throw new \local_arina_prism_sense\exception\api_response_exception('PDF_UPLOAD_FAILED');
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
            'local_arina_prism_sense_sources',
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
            'batch_id'         => $batchId,
            'curriculum_text'  => $data->curriculum_text,
            'regen_count'      => $data->regen_count,
            'video_length'     => $data->video_length,
            'content_strategy' => $data->content_strategy,
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
        $apiUrl = API_TRIGGER_GENERATION . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER     => [
                'X-Api-Key: ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
        $status           = $responseData['status'] ?? 'unknown';
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
     * @throws \local_arina_prism_sense\exception\api_response_exception
     */
    private function handleTriggerFailure($responseData)
    {
        $errorMsg = $this->extractErrorMessage($responseData);
        mtrace("✗ FAILED: $errorMsg");
        throw new \local_arina_prism_sense\exception\api_response_exception($errorMsg);
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
        $shouldTrigger       = $responseData['should_trigger_generation'] ?? false;

        mtrace("  - all_uploads_completed: " . ($allUploadsCompleted ? 'true' : 'false'));
        mtrace("  - should_trigger_generation: " . ($shouldTrigger ? 'true' : 'false'));
        mtrace("  - status: $status");

        if (!$allUploadsCompleted) {
            mtrace("  ⏳ PDFs still being processed...");
        } else if (!$shouldTrigger) {
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

        $orgId      = $data->tenant_id; // value is org_id — key preserved for task data backwards compat
        $courseid   = $data->course_id;
        $sectionid  = $data->section_id;
        $regenCount = $data->regen_count;

        $containerName = strtolower('Blob-Tutorial-Gen-' . $orgId);
        $folderName    = "Tutorial_{$courseid}_{$sectionid}_{$regenCount}";

        $isVideo = ($contentType === 'video' || $avatarVideoNeeded === 'yes');

        // Update content record with request_id and Azure blob info
        $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentId]);
        if ($content) {
            $generationData = json_decode($content->generationdata, true) ?: [];
            $generationData['request_id']         = $requestId;
            $generationData['azure_container']    = $containerName;
            $generationData['azure_folder']       = $folderName;
            $generationData['is_video']           = $isVideo;
            $generationData['async_initiated_at'] = time();

            $content->request_id      = $requestId;
            $content->generationdata  = json_encode($generationData);
            $content->timemodified    = time();
            $DB->update_record('local_arina_prism_sense_content', $content);
        }
    }
}
