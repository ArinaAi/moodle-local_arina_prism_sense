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
 * Legacy direct-API-call workflow for generate_content_task.
 *
 * Used for video generation and feedback-based regenerations that cannot
 * use the trigger_generation endpoint.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait LegacyApiCallTrait
{
    /**
     * Construct the API URL based on content type and parameters
     * @param object $data Task data
     * @param string $contentType Content type (video/slides)
     * @param string $avatarVideoNeeded Avatar video flag
     * @param string|null $userUuid User's owner UUID for credit tracking
     */
    private function getApiUrl($data, $contentType, $avatarVideoNeeded, $userUuid = null)
    {
        $orgId           = $data->tenant_id; // value is org_id — key preserved for task data
        $courseid        = $data->course_id;
        $sectionid       = $data->section_id;
        $regenCount      = $data->regen_count;
        $videoLength     = $data->video_length;
        $contentStrategy = $data->content_strategy;

        $language       = isset($data->language)        ? $data->language        : 'english';
        $voiceGender    = isset($data->voice_gender)    ? $data->voice_gender    : 'female';
        $avatarStrategy = isset($data->avatar_strategy) ? $data->avatar_strategy : 'title_only';
        $curriculumText = $data->curriculum_text;

        // Check if Video Generation is requested
        if ($contentType === 'video' || $avatarVideoNeeded === 'yes') {
            $baseUrl  = API_GENERATE_VIDEO;
            $videoUrl = $baseUrl .
                '?course_id=' . $courseid .
                '&organization_id=' . $orgId .
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
            $pptxUrl = API_GENERATE_PPTX .
                '?curriculum_text=' . urlencode(trim($curriculumText)) .
                '&organization_id=' . urlencode($orgId) .
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
                $fb           = is_array($data->feedback) ? $data->feedback : (array) $data->feedback;
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
        $apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key');
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
     * @throws \local_arina_prism_sense\exception\curl_init_exception
     */
    private function initializeCurl($apiUrl, $apiKey)
    {
        $ch = curl_init($apiUrl);
        if ($ch === false) {
            throw new \local_arina_prism_sense\exception\curl_init_exception('Failed to initialize cURL');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 300,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_TCP_KEEPALIVE  => 1,
            CURLOPT_TCP_KEEPIDLE   => 30,
            CURLOPT_TCP_KEEPINTVL  => 15,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded',
                'X-API-key: ' . $apiKey,
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
     * @throws \local_arina_prism_sense\exception\curl_execution_exception
     */
    private function checkCurlErrors($ch)
    {
        if (curl_errno($ch)) {
            $curlError = curl_error($ch);
            curl_close($ch);
            throw new \local_arina_prism_sense\exception\curl_execution_exception('cURL error: ' . $curlError);
        }
    }

    /**
     * Process API call response based on HTTP code
     *
     * @param int $httpCode HTTP status code
     * @param string $response Response body
     * @return array Decoded JSON response
     * @throws \local_arina_prism_sense\exception\api_http_exception
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
     * @throws \local_arina_prism_sense\exception\api_http_exception
     */
    private function handleAuthenticationError()
    {
        mtrace("API authentication failed: HTTP 401 (API key is missing or incorrect)");
        throw new \local_arina_prism_sense\exception\api_http_exception('API key is missing or incorrect.
            Please check your settings.');
    }

    /**
     * Handle API error response
     *
     * @param int $httpCode HTTP status code
     * @param string $response Response body
     * @throws \local_arina_prism_sense\exception\api_http_exception
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

        throw new \local_arina_prism_sense\exception\api_http_exception($errorMsg);
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

        $orgId      = $data->tenant_id; // value is org_id — key preserved for task data
        $courseid   = $data->course_id;
        $sectionid  = $data->section_id;
        $regenCount = $data->regen_count;
        $contentId  = $data->content_id;

        $containerName = strtolower('Blob-Tutorial-Gen-' . $orgId);
        $folderName    = "Tutorial_{$courseid}_{$sectionid}_{$regenCount}";

        $isVideo = ($contentType === 'video' || $avatarVideoNeeded === 'yes');

        if ($isVideo) {
            $remoteFileName = "video_tutorial_{$courseid}_{$sectionid}.mp4";
            $localFileName  = 'video_' . $contentId . '_' . time() . '.mp4';
        } else {
            $remoteFileName = "slide_tutorial_{$courseid}_{$sectionid}.pptx";
            $localFileName  = 'slides_' . $contentId . '_' . time() . '.pptx';
        }

        $blobName = $folderName . '/' . $remoteFileName;
        $filepath = $CFG->tempdir . '/arina_prism_sense/' . $localFileName;

        if (!is_dir($CFG->tempdir . '/arina_prism_sense')) {
            mkdir($CFG->tempdir . '/arina_prism_sense', 0755, true);
        }

        $apiKey  = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key');
        $success = \local_arina_prism_sense\Utils::downloadFileViaAuthService(
            $blobName,
            $filepath,
            $containerName,
            $apiKey
        );

        if (!$success || !file_exists($filepath) || filesize($filepath) === 0) {
            throw new \local_arina_prism_sense\exception\azure_download_exception(
                "Failed to download file ($remoteFileName) from Azure Blob Storage (or empty file)"
            );
        }

        $updateData = [
            'blobName'      => $blobName,
            'containerName' => $containerName,
            'folderName'    => $folderName,
            'localFileName' => $localFileName,
            'filepath'      => $filepath,
            'isVideo'       => $isVideo,
            'sectionid'     => $sectionid,
            'courseid'      => $courseid,
            'contentId'     => $contentId,
        ];

        $this->updateContentRecord($content, $updateData);
    }

    /**
     * Update DB record with completion data
     */
    private function updateContentRecord($content, $updateData)
    {
        global $DB, $CFG;

        $blobName      = $updateData['blobName'];
        $containerName = $updateData['containerName'];
        $folderName    = $updateData['folderName'];
        $localFileName = $updateData['localFileName'];
        $filepath      = $updateData['filepath'];
        $isVideo       = $updateData['isVideo'];
        $sectionid     = $updateData['sectionid'];
        $courseid      = $updateData['courseid'];
        $contentId     = $updateData['contentId'];

        $genDataUpdate = [
            'completed_at'   => time(),
            'azure_blob_name' => $blobName,
            'azure_container' => $containerName,
            'azure_folder'   => $folderName,
        ];

        if ($isVideo) {
            $genDataUpdate['video_file'] = $localFileName;
            $genDataUpdate['video_path'] = $filepath;
            $genDataUpdate['video_size'] = filesize($filepath);
            $genDataUpdate['result']     = [
                'status'  => 'success',
                'results' => [
                    [
                        'topic'         => "Section " . $sectionid,
                        'videoUrl'      => "{$CFG->wwwroot}/local/arina_prism_sense/api/stream_video.php?" .
                            "contentid={$contentId}&courseid={$courseid}",
                        'videoDuration' => 0,
                    ],
                ],
            ];
        } else {
            $slideCount = \local_arina_prism_sense\Utils::countSlidesInPptx($filepath);
            $genDataUpdate['pptx_file']   = $localFileName;
            $genDataUpdate['pptx_path']   = $filepath;
            $genDataUpdate['slide_count'] = $slideCount;
            $genDataUpdate['result']      = [
                'status'  => 'success',
                'results' => [
                    [
                        'topic'      => "Section " . $sectionid,
                        'slideCount' => $slideCount,
                        'pptxFile'   => $localFileName,
                    ],
                ],
            ];
        }

        $content->status         = 'ready';
        $content->generationdata = json_encode(array_merge(
            json_decode($content->generationdata, true) ?: [],
            $genDataUpdate
        ));
        $content->timemodified = time();
        $DB->update_record('local_arina_prism_sense_content', $content);
    }
}
