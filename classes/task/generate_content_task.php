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

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');
require_once(__DIR__ . '/../CompanyConfig.php');
require_once(__DIR__ . '/../ErrorClassifier.php');
require_once(__DIR__ . '/TriggerGenerationTrait.php');
require_once(__DIR__ . '/LegacyApiCallTrait.php');
require_once(__DIR__ . '/ContentFailureTrait.php');
require_once(__DIR__ . '/UserCreditTrait.php');

/**
 * Adhoc task to initiate content generation asynchronously via Kafka
 *
 * This task now handles the INITIAL API call which returns immediately with a request_id.
 * The actual file download is handled by the scheduled poll_content_status_task.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 */
class generate_content_task extends \core\task\adhoc_task // phpcs:ignore Squiz.Classes.ValidClassName.NotCamelCaps
{
    use TriggerGenerationTrait;
    use LegacyApiCallTrait;
    use ContentFailureTrait;
    use UserCreditTrait;

    /**
     * Execute the task.
     */
    public function execute()
    {
        global $DB;

        $taskData = $this->initializeTaskData();
        $contentId = $taskData['contentId'];

        try {
            $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentId]);
            if (!$content) {
                mtrace("Content record $contentId not found, aborting.");
                return;
            }

            // Skip trigger_generation for:
            // 1. Feedback-based regenerations — detected via parent_content_id > 0.
            //    NOTE: we cannot use $taskData['data']->feedback because save_content_feedback.php
            //    stores feedback in the external Arina service, not local_arina_prism_sense_feedback,
            //    so feedbackDetails is always null here. parent_content_id is the reliable signal.
            // 2. Video generation — trigger_generation doesn't support video params
            //    (language, voice_gender, avatar_strategy); use generate_video directly.
            $isRegeneration = !empty($taskData['data']->parent_content_id) &&
                ((int) $taskData['data']->parent_content_id) > 0;
            $isVideo = ($taskData['contentType'] === 'video' || $taskData['avatarVideoNeeded'] === 'yes');

            if (!$isRegeneration && !$isVideo) {
                if (!$this->handleNewWorkflow($taskData)) {
                    // Polling exhausted after 3 hours without a content_request_id.
                    // Do NOT fall back to generate_pptx; surface the error to the user.
                    $this->handleFailure(
                        $contentId,
                        'Generating failed, please try again.'
                    );
                }
                return;
            }

            // Video / regeneration paths still use the legacy workflow.
            $this->handleLegacyWorkflow($content, $taskData);
        } catch (\Exception $e) {
            mtrace("Error generating content: " . $e->getMessage());
            $this->handleFailure($contentId, $this->classifyError($e->getMessage()));
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
            \local_arina_prism_sense\CompanyConfig::bootstrap((int) $data->user_id);
        }

        $userUuid = $this->getUserUuidForCredit($data);
        mtrace("User UUID for credit tracking: " .
            ($userUuid ? $userUuid : 'NULL - user may not have wallet allocated'));

        // If the user topped up out-of-band, reset state so the post-generation check triggers.
        $this->syncCreditStateIfTopped($userUuid, $data);

        mtrace("Starting content generation for content ID: $contentId. Type: $contentType");

        return [
            'data' => $data,
            'contentId' => $contentId,
            'contentType' => $contentType,
            'avatarVideoNeeded' => $avatarVideoNeeded,
            'userUuid' => $userUuid,
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
            throw new \local_arina_prism_sense\exception\api_response_exception($errorMsg);
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
            throw new \local_arina_prism_sense\exception\api_response_exception(
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

    // Methods triggerGenerationWithPolling and below live in TriggerGenerationTrait,
    // LegacyApiCallTrait, ContentFailureTrait, and UserCreditTrait.
}
