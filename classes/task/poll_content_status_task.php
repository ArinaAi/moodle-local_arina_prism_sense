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
require_once(__DIR__ . '/../EmailNotifier.php');

/**
 * Scheduled task to poll backend for content generation status
 *
 * This task runs every minute and checks the backend's batch /status/batch endpoint
 * for all content items with status='generating'. A single request is made for all
 * pending items, reducing backend load as the system scales.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 */
class poll_content_status_task extends \core\task\scheduled_task // phpcs:ignore Squiz.Classes.ValidClassName.NotCamelCaps
{
    /**
     * Get a descriptive name for this task
     *
     * @return string
     */
    public function get_name() // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        return get_string('task:poll_content_status', 'local_arina_prism_sense');
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
            'local_arina_prism_sense_content',
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

        // Bootstrap CompanyConfig from the first pending item's originating user.
        // In a single-tenant deployment all items share the same tenant, so one
        // bootstrap is sufficient for the batch API call.
        $firstContent = reset($requestIdToContent);
        if (!empty($firstContent->userid)) {
            \local_arina_prism_sense\CompanyConfig::bootstrap((int) $firstContent->userid);
        }
        $apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key');

        // Single batch call to backend — replaces N individual calls
        mtrace("Calling batch status endpoint with " . count($requestIds) . " request_id(s)...");
        $batchResponse = $this->checkBatchBackendStatus($requestIds, $apiKey);

        if ($batchResponse === null) {
            mtrace("Batch status call failed or returned no response. Will retry on next run.");
            return;
        }

        // Process each item using its status from the batch response.
        // Re-bootstrap per item so that tenant-specific config (api_key, tenant_id)
        // is correct even in a future multi-tenant scenario.
        foreach ($requestIdToContent as $requestId => $content) {
            if (!isset($batchResponse[$requestId])) {
                mtrace("  - No status returned for request_id {$requestId}, will retry later.");
                continue;
            }

            $statusResponse = $batchResponse[$requestId];

            // Re-bootstrap for each item's originating user (no-op if same tenant).
            if (!empty($content->userid)) {
                \local_arina_prism_sense\CompanyConfig::reset();
                \local_arina_prism_sense\CompanyConfig::bootstrap((int) $content->userid);
            }

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
     * @param  string   $apiKey      API key resolved by the caller via CompanyConfig
     * @return array|null            Flat map keyed by request_id, or null on failure
     */
    private function checkBatchBackendStatus(array $requestIds, string $apiKey)
    {
        $result = null;
        $url = API_CHECK_STATUS_BATCH;
        $body = json_encode(['request_ids' => $requestIds]);

        $ch = curl_init($url);
        if ($ch === false) {
            mtrace("  - Failed to initialize cURL for batch request");
            return $result;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-API-key: ' . $apiKey,
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrno = curl_errno($ch);
        $curlError = curl_error($ch);

        curl_close($ch);

        if ($curlErrno) {
            mtrace("  - cURL error on batch request: " . $curlError);
        } elseif ($httpCode === 401) {
            mtrace("  - API authentication failed: HTTP 401 (API key is missing or incorrect)");
            // Create a pseudo-response that applies this error to all requested IDs
            $result = [];
            foreach ($requestIds as $id) {
                $result[$id] = [
                    'status' => 'error',
                    'error' => 'API key is missing or incorrect. Please check your settings.',
                ];
            }
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
     * @param object $content        DB record from local_arina_prism_sense_content
     * @param array  $statusResponse Status data from the batch response for this request_id
     */
    private function processContentStatus($content, array $statusResponse)
    {
        $requestId = $content->request_id;
        $status = $statusResponse['status'] ?? 'unknown';

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
        $isVideo = $generationData['is_video'] ?? false;

        $containerName = $generationData['azure_container'] ?? null;
        $folderName = $generationData['azure_folder'] ?? null;

        // Use the original Moodle IDs from the DB record, rather than backend IDs parsed from folderName
        $courseid = $content->courseid;
        $sectionid = $content->sectionid;

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
        $blobUrl = $blobInfo['url'];

        $filepath = $CFG->tempdir . '/arina_prism_sense/' . $localFileName;

        if (!is_dir($CFG->tempdir . '/arina_prism_sense')) {
            mkdir($CFG->tempdir . '/arina_prism_sense', 0755, true);
        }

        // Extract blob name from URL if available (authenticated Azure download)
        if ($blobUrl) {
            $blobName = \local_arina_prism_sense\Utils::extractBlobNameFromUrl($blobUrl);
            mtrace("    Extracted blob name from URL: {$blobName}");
        }

        $apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key');
        $success = \local_arina_prism_sense\Utils::downloadFileViaAuthService(
            $blobName,
            $filepath,
            $containerName,
            $apiKey
        );

        if (!$success || !file_exists($filepath) || filesize($filepath) === 0) {
            throw new \local_arina_prism_sense\exception\azure_download_exception(
                "Failed to download file from Azure: {$blobName}"
            );
        }

        mtrace("    Downloaded file: {$localFileName} (" . filesize($filepath) . " bytes)");

        $fileDetails = ['path' => $filepath, 'name' => $localFileName];
        $context = ['isVideo' => $isVideo, 'courseid' => $courseid, 'sectionid' => $sectionid];

        $this->updateContentOnSuccess($content, $generationData, $blobName, $statusResponse, $fileDetails, $context);
    }

    /**
     * Handle failed content generation — mark as error in DB.
     *
     * Classifies the raw backend error into a sentinel code before persisting
     * so that raw API error text is never stored in the DB or shown to users.
     * Raw text is only kept in mtrace output for admin debugging.
     */
    private function handleFailed($content, $statusResponse)
    {
        global $DB;

        // Extract raw error text for logging only.
        $rawError = $statusResponse['error'] ?? $statusResponse['message'] ?? 'Unknown error from backend';
        mtrace("    Content generation failed (raw): {$rawError}");

        // Classify raw error → sentinel code.
        $sentinel = $this->classifyError((string) $rawError);

        $content->status = 'error';
        $content->errormessage = $sentinel;
        $content->timemodified = time();

        $generationData = json_decode($content->generationdata, true) ?: [];
        $generationData['backend_error_response'] = $statusResponse;
        $content->generationdata = json_encode($generationData);

        $DB->update_record('local_arina_prism_sense_content', $content);

        // Notify the user by email. Pass the sentinel so EmailNotifier can
        // translate it to a human-readable message without leaking raw details.
        try {
            \local_arina_prism_sense\EmailNotifier::sendContentFailure($content, $sentinel);
        } catch (\Throwable $emailEx) {
            mtrace("    Email notification failed (non-fatal): " . $emailEx->getMessage());
        }
    }

    /**
     * Classify a raw backend error string into a sentinel code.
     *
     * Mirrors the same logic in generate_content_task::classifyError().
     * @param  string $raw  Raw error text from the backend status response
     * @return string       Sentinel code, or '' for generic errors
     */
    private function classifyError(string $raw): string
    {
        return \local_arina_prism_sense\ErrorClassifier::classify($raw);
    }

    /**
     * Persist the updated generation data and bump timemodified.
     */
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
                'results' => [
                    [
                        'topic' => "Section " . $sid,
                        'videoUrl' => "{$CFG->wwwroot}/local/arina_prism_sense/api/stream_video.php?" .
                            "contentid={$content->id}&courseid={$cid}",
                        'videoDuration' => 0,
                    ],
                ],
            ];
        } else {
            $slideCount = \local_arina_prism_sense\Utils::countSlidesInPptx($fpath);
            $genDataUpdate['pptx_file'] = $localName;
            $genDataUpdate['pptx_path'] = $fpath;
            $genDataUpdate['slide_count'] = $slideCount;
            $genDataUpdate['result'] = [
                'status' => 'success',
                'results' => [
                    [
                        'topic' => "Section " . $sid,
                        'slideCount' => $slideCount,
                        'pptxFile' => $localName,
                    ],
                ],
            ];
            mtrace("    Slide count: {$slideCount}");
        }

        $content->status = 'ready';
        $content->generationdata = json_encode(array_merge($genData, $genDataUpdate));
        $content->timemodified = time();
        $DB->update_record('local_arina_prism_sense_content', $content);
        mtrace("    Content {$content->id} marked as ready!");

        // Notify the user by email that their content is ready.
        try {
            \local_arina_prism_sense\EmailNotifier::sendContentSuccess($content);
        } catch (\Throwable $emailEx) {
            mtrace("    Email notification failed (non-fatal): " . $emailEx->getMessage());
        }

        // Delete the parent content record now that the regenerated content is fully ready.
        $this->deleteParentContent($content);

        // Check if credits have dropped past thresholds
        $this->checkUserCredits($content);
    }

    /**
     * Determine which Azure blob to download from the status response.
     */
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
            mtrace("    Using URL from backend response: {$blobUrl}");
            $blobName = \local_arina_prism_sense\Utils::extractBlobNameFromUrl($blobUrl);
        } else {
            if (!$containerName || !$folderName) {
                throw new \local_arina_prism_sense\exception\api_response_exception(
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

        $DB->update_record(
            'local_arina_prism_sense_content',
            (object) [
                'id' => $content->id,
                'generationdata' => json_encode($generationData),
                'timemodified' => time(),
            ]
        );
    }

    /**
     * Delete the parent content record once regenerated content is ready.
     *
     * Only fires when this content is a regeneration (has a parent_content_id).
     * Feedback records in local_arina_prism_sense_feedback are intentionally preserved.
     * Azure files are NOT touched — they are needed for regen_count calculation.
     *
     * Chain behaviour: A→B→C
     *   When B becomes ready  → A is deleted.
     *   When C becomes ready  → B is deleted.
     *
     * @param object $content The newly-ready content record (the child/regeneration)
     */
    private function deleteParentContent($content)
    {
        global $DB;

        if (empty($content->parent_content_id)) {
            // Not a regeneration — nothing to delete.
            return;
        }

        $parentId = (int) $content->parent_content_id;

        if (!$DB->record_exists('local_arina_prism_sense_content', ['id' => $parentId])) {
            mtrace("    Parent content {$parentId} not found, skipping deletion.");
            return;
        }

        $DB->delete_records('local_arina_prism_sense_content', ['id' => $parentId]);
        mtrace("    Deleted parent content record {$parentId} (superseded by content {$content->id}).");
    }

    /**
     * Check individual wallet balance after generation and notify if low.
     */
    private function checkUserCredits($content)
    {
        global $DB;
        $userid = (int) ($content->userid ?? $content->createdby ?? 0);
        if (!$userid) {
            return;
        }

        // --- 1. Fast path: preference cache ---
        $uuid = get_user_preferences('arina_prism_sense_wallet_sub_user_id', null, $userid);

        // --- 2. Slow path: resolve via Arina (registers + provisions wallet if needed) ---
        if (empty($uuid)) {
            try {
                $resolveClient = new \local_arina_prism_sense\cms\CreditServiceClient();
                $profile       = $resolveClient->ensureSubUserRegistered($userid);
                $uuid          = $profile['user_id'] ?? null;
                if (!empty($uuid)) {
                    set_user_preference('arina_prism_sense_wallet_sub_user_id', $uuid, $userid);
                }
            } catch (\Throwable $e) {
                mtrace("    checkUserCredits: could not resolve UUID for user {$userid}: " . $e->getMessage());
            }
        }

        if (!$uuid) {
            return;
        }

        $client = new \local_arina_prism_sense\cms\CreditServiceClient();
        $walletId = $client->resolveWalletId($uuid);
        if (!$walletId) {
            return;
        }

        $balRes = $client->getWalletBalance($walletId);
        $this->resolveCreditState($balRes, $userid);
    }

    /**
     * Evaluate the API balance response and dispatch alerts if threshold is crossed.
     *
     * @param array $balRes  Raw API response from getWalletBalance()
     * @param int   $userid  Moodle user ID
     */
    private function resolveCreditState($balRes, $userid)
    {
        global $DB;
        $isValidResponse = $balRes['status'] >= 200
            && $balRes['status'] < 300
            && isset($balRes['data']['current_balance']);
        if (!$isValidResponse) {
            return;
        }

        $balance = (float) $balRes['data']['current_balance'];
        $lastState = get_user_preferences('arina_prism_sense_low_credits_state', 'ok', $userid);
        [$currentState, $isZero] = $this->classifyCreditBalance($balance);

        if ($currentState !== 'ok' && $lastState !== $currentState) {
            $user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
            if ($user) {
                $this->notifyCreditAlert($user, $userid, $balance, $currentState, $lastState, $isZero);
            }
        } elseif ($currentState === 'ok' && $lastState !== 'ok') {
            set_user_preference('arina_prism_sense_low_credits_state', 'ok', $userid);
        }
    }

    /**
     * Classify a credit balance into a state string and zero-flag.
     *
     * @param  float $balance
     * @return array [string $state, bool $isZero]  e.g. ['low', false]
     */
    private function classifyCreditBalance($balance)
    {
        if ($balance <= 0) {
            return ['zero', true];
        }
        if ($balance < 100) {
            return ['low', false];
        }
        return ['ok', false];
    }

    /**
     * Send low-credit alerts to the user and all admins, then persist the new state.
     *
     * @param object $user         The Moodle user object
     * @param int    $userid       The user ID
     * @param float  $balance      Current wallet balance
     * @param string $currentState 'low' or 'zero'
     * @param string $lastState    Previous stored state
     * @param bool   $isZero       Whether balance is at or below zero
     */
    private function notifyCreditAlert($user, $userid, $balance, $currentState, $lastState, $isZero)
    {
        mtrace(
            "    Checking credits for user {$userid}: balance={$balance}. " .
            "State changed {$lastState} -> {$currentState}. Sending emails."
        );
        try {
            \local_arina_prism_sense\EmailNotifier::sendLowCreditsUser($user, $balance, 100.0, $isZero);

            // Notify admins/managers as well
            $admins = \local_arina_prism_sense\Utils::getAdminsAndCompanyManagers($userid);
            foreach ($admins as $admin) {
                \local_arina_prism_sense\EmailNotifier::sendLowCreditsUserToAdmin(
                    $admin,
                    $user,
                    $balance,
                    100.0,
                    $isZero
                );
            }
            set_user_preference('arina_prism_sense_low_credits_state', $currentState, $userid);
        } catch (\Throwable $e) {
            mtrace("    Error sending low credits email: " . $e->getMessage());
        }
    }
}
