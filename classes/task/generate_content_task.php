<?php
namespace local_lecturebot\task;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');
require_once(__DIR__ . '/../../configurator_azure.php');

/**
 * Adhoc task to generate content asynchronously
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
        $contentId = $data->content_id;
        
        // Optional params for decision making
        $contentType = isset($data->content_type) ? $data->content_type : 'slides';
        $avatarVideoNeeded = isset($data->avtar_video_needed) ? $data->avtar_video_needed : 'no';

        mtrace("Starting content generation for content ID: $contentId. Type: $contentType");

        try {
            // Check if content still exists
            $content = $DB->get_record('local_lecturebot_content', ['id' => $contentId]);
            if (!$content) {
                mtrace("Content record $contentId not found, aborting.");
                return;
            }

            // 1. Prepare API Request
            $endpoint = $this->getApiEndpoint($contentType, $avatarVideoNeeded);
            $payload = $this->getApiPayload($data, $contentType, $avatarVideoNeeded);
            
            mtrace("Calling API URL: $endpoint");

            // 2. Execute API Call
            $apiResponse = $this->executeApiCall($endpoint, $payload);

            // 3. Process Response
            if ($this->isApiSuccess($apiResponse)) {
                mtrace("Backend API returned success, fetching file from Azure Blob Storage");
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
     * Determine the API Endpoint
     */
    private function getApiEndpoint($contentType, $avatarVideoNeeded)
    {
        if ($contentType === 'video' || $avatarVideoNeeded === 'yes') {
            return LECTUREBOT_API_GENERATE_VIDEO;
        }
        return LECTUREBOT_API_GENERATE_PPTX;
    }

    /**
     * Construct the API Payload
     */
    private function getApiPayload($data, $contentType, $avatarVideoNeeded)
    {
        $payload = [
            'organization_id' => (string)$data->tenant_id,
            'course_id' => (string)$data->course_id,
            'chapter_id' => (string)$data->section_id,
            'regen_count' => (int)$data->regen_count, // Keep int as per likely requirement, but check if needed
            'content_strategy' => $data->content_strategy,
            'video_length' => (int)$data->video_length,
        ];

        // Specific fields
        if ($contentType === 'video' || $avatarVideoNeeded === 'yes') {
            $payload['language'] = isset($data->language) ? $data->language : 'english';
            $payload['voice_gender'] = isset($data->voice_gender) ? $data->voice_gender : 'female';
            $payload['avatar_strategy'] = isset($data->avatar_strategy) ? $data->avatar_strategy : 'title_only';
        } else {
            // PPTX specific
            $payload['curriculum_text'] = trim($data->curriculum_text);
            
            // Fix for 400 Error: "curriculum_structure must be a list"
            // The API requires a structure outline. We provide a default one if none exists.
            $payload['curriculum_structure'] = [
                [
                    'title' => 'Lecture Content',
                    'type' => 'topic',
                    'subtopics' => [
                        [
                            'title' => 'Overview',
                            'type' => 'sub-topic'
                        ]
                    ]
                ]
            ];
        }

        return $payload;
    }

    /**
     * Execute the cURL call to the backend API
     */
    private function executeApiCall($apiUrl, $data = [])
    {
        $ch = curl_init($apiUrl);
        if ($ch === false) {
            throw new \local_lecturebot\exception\curl_init_exception('Failed to initialize cURL');
        }

        $jsonData = json_encode($data);

        mtrace("LectureBot API Request Payload: " . $jsonData);
        error_log("LectureBot API Request Payload: " . $jsonData);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $jsonData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 7200, // 2 hours timeout
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_TCP_KEEPALIVE => 1,
            CURLOPT_TCP_KEEPIDLE => 30,
            CURLOPT_TCP_KEEPINTVL => 15,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'Content-Length: ' . strlen($jsonData)
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

        if ($httpCode === 200 && !empty($response)) {
            return json_decode($response, true);
        }
        
        // Log the full response for debugging 422 errors
        $preview = substr($response, 0, 2000);
        error_log("LectureBot API Error [$httpCode]: " . $preview);
        mtrace("LectureBot API Error [$httpCode]: " . $preview);

        throw new \local_lecturebot\exception\api_http_exception(
            'API returned HTTP ' . $httpCode . ' Body: ' . $preview
        );
    }

    /**
     * Check if API response indicates success
     */
    private function isApiSuccess($apiResponse)
    {
        return $apiResponse && (
            (isset($apiResponse['success']) && $apiResponse['success'] === true) ||
            (isset($apiResponse['Success']) && $apiResponse['Success'] === true)
        );
    }

    /**
     * Handle successful content generation
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

        $success = $this->downloadFileFromAzure($blobName, $filepath, $containerName);
        
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
            $slideCount = $this->countSlidesInPptx($filepath);
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
     * Download File from Azure Blob Storage directly to path (Memory Efficient)
     */
    private function downloadFileFromAzure($blobName, $outputPath, $containerName = null)
        {
        try {
            $accountName = AZURE_STORAGE_ACCOUNT_NAME;
            $targetContainer = $containerName ? $containerName : AZURE_BLOB_CONTAINER_NAME;
            $blobUrl = "https://{$accountName}.blob.core.windows.net/{$targetContainer}/{$blobName}";
            
            $date = gmdate('D, d M Y H:i:s T');
            $version = '2020-04-08';
            
            $stringToSign = "GET\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "x-ms-date:{$date}\n" .
                           "x-ms-version:{$version}\n" .
                           "/{$accountName}/{$targetContainer}/{$blobName}";
            
            $signature = base64_encode(hash_hmac(
                'sha256',
                mb_convert_encoding($stringToSign, "UTF-8"),
                base64_decode(AZURE_STORAGE_ACCOUNT_KEY),
                true
            ));
            $authHeader = "SharedKey {$accountName}:{$signature}";
            
            $fp = fopen($outputPath, 'w+');
            if (!$fp) {
                throw new \local_lecturebot\exception\file_system_exception("Could not open output path: $outputPath");
            }

            $ch = curl_init($blobUrl);
            curl_setopt_array($ch, [
                CURLOPT_FILE => $fp, // Write directly to file handle
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER => [
                    "x-ms-date: {$date}",
                    "x-ms-version: {$version}",
                    "Authorization: {$authHeader}"
                ],
                CURLOPT_TIMEOUT => 0,
                CURLOPT_CONNECTTIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
            ]);
            
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if (curl_errno($ch)) {
                $err = curl_error($ch);
                curl_close($ch);
                fclose($fp);
                throw new \local_lecturebot\exception\curl_execution_exception($err);
            }
            curl_close($ch);
            fclose($fp);
            
            if ($httpCode !== 200) {
                // If failed, file might contain error XML, delete it
                if (file_exists($outputPath)) {unlink($outputPath);}
                throw new \local_lecturebot\exception\azure_download_exception("Azure returned HTTP $httpCode");
            }
            
            return true;
            
        } catch (\Exception $e) {
            mtrace("Error downloading from Azure: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Count slides in PPTX file
     */
    private function countSlidesInPptx($pptxPath)
    {
        $slideCount = 0;
        try {
            $zip = new \ZipArchive();
            if ($zip->open($pptxPath) === true) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    if (preg_match('/ppt\/slides\/slide(\d+)\.xml/', $filename, $matches)) {
                        $slideNumber = (int)$matches[1];
                        $slideCount = max($slideCount, $slideNumber);
                    }
                }
                $zip->close();
            }
        } catch (\Exception $e) {
            mtrace("Error counting slides: " . $e->getMessage());
        }
        return $slideCount;
    }
}
