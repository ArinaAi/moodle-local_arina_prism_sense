<?php
/**
 * API endpoint to upload source PDFs for a specific section
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');
require_once($CFG->libdir . '/filelib.php');
require_once(__DIR__ . '/../lib_azure_storage.php');
require_once(__DIR__ . '/../classes/exception/curl_execution_exception.php');
require_once(__DIR__ . '/../classes/exception/api_http_exception.php');
require_once(__DIR__ . '/cms/CreditServiceClient.php');

header('Content-Type: application/json');

error_log('LectureBot: upload_source.php initialized');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $sectionid = required_param('sectionid', PARAM_INT);

    // Require login and capability
    error_log("LectureBot: Checking login for course $courseid");
    require_login($courseid);
    error_log("LectureBot: Login successful");
    $context = context_course::instance($courseid);
    require_capability(LECTUREBOT_CAPABILITY_GENERATE_CONTENT, $context);
    require_sesskey();

    // Check existing sources for this section (max 3)
    $existingcount = $DB->count_records('local_lecturebot_sources', [
        'courseid' => $courseid,
        'sectionid' => $sectionid
    ]);

    // Handle multiple file uploads
    $uploadedFiles = [];
    $titles = [];
    $authors = [];
    $isPhotographs = [];

    // Check if files were uploaded (supports both single and multiple file upload)
    if (!isset($_FILES['pdf'])) {
        throw new moodle_exception('No files uploaded');
    }

    // Handle multiple files sent as pdf[]
    if (is_array($_FILES['pdf']['name'])) {
        $fileCount = count($_FILES['pdf']['name']);
        for ($i = 0; $i < $fileCount; $i++) {
            if ($_FILES['pdf']['error'][$i] === UPLOAD_ERR_OK) {
                $uploadedFiles[] = [
                    'name' => $_FILES['pdf']['name'][$i],
                    'type' => $_FILES['pdf']['type'][$i],
                    'tmp_name' => $_FILES['pdf']['tmp_name'][$i],
                    'size' => $_FILES['pdf']['size'][$i],
                    'error' => $_FILES['pdf']['error'][$i]
                ];
            }
        }
        // Get titles and authors as arrays
        $titles = isset($_POST['title']) && is_array($_POST['title']) ? $_POST['title'] : [];
        $authors = isset($_POST['author']) && is_array($_POST['author']) ? $_POST['author'] : [];
        // Get is_photograph flag array for scanned PDF detection
        $isPhotographs = isset($_POST['is_photograph']) &&
            is_array($_POST['is_photograph']) ? $_POST['is_photograph'] : [];
    } else {
        // Single file upload (backward compatibility)
        if ($_FILES['pdf']['error'] === UPLOAD_ERR_OK) {
            $uploadedFiles[] = $_FILES['pdf'];
            $titles[] = optional_param('title', '', PARAM_TEXT);
            $authors[] = optional_param('author', '', PARAM_TEXT);
            $isPhotographs[] = optional_param('is_photograph', 'false', PARAM_TEXT);
        }
    }

    if (empty($uploadedFiles)) {
        throw new moodle_exception('No valid files uploaded');
    }

    // Check if total would exceed limit
    if ($existingcount + count($uploadedFiles) > 3) {
        throw new moodle_exception('Upload would exceed maximum of 3 PDFs per section');
    }

    // Validate all files before processing
    $maxsize = 3 * 1024 * 1024;
    foreach ($uploadedFiles as $file) {
        // Check MIME type (basic check)
        if ($file['type'] !== 'application/pdf') {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'error' => 'Only PDF files are allowed'
            ]);
            exit;
        }

        // Check file size
        if ($file['size'] > $maxsize) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'error' => 'File "' . $file['name'] . '" exceeds the 3MB size limit'
            ]);
            exit;
        }

        // Validate actual PDF content by checking magic bytes
        $fileHandle = fopen($file['tmp_name'], 'rb');
        if ($fileHandle) {
            $header = fread($fileHandle, 5);
            fclose($fileHandle);

            // PDF files must start with %PDF-
            if (substr($header, 0, 4) !== '%PDF') {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error',
                    'error' => 'Invalid PDF file: "' .
                        $file['name'] .
                        '". This file appears to be corrupted
                     or is not a valid PDF document.
                     Please select a genuine PDF file.'
                ]);
                exit;
            }
        } else {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'error' => 'Unable to read file: ' . $file['name']
            ]);
            exit;
        }
    }

    // Process and store all files in Moodle first
    $fs = get_file_storage();
    $storedFiles = [];
    $dbRecords = [];

    foreach ($uploadedFiles as $index => $file) {
        // Generate unique itemid for this file
        $itemid = time() . random_int(1000, 9999);

        // Prepare file record
        $filerecord = array(
            'contextid' => $context->id,
            'component' => 'local_lecturebot',
            'filearea' => 'sources',
            'itemid' => $itemid,
            'filepath' => '/',
            'filename' => clean_filename($file['name']),
            'userid' => $USER->id
        );

        // Save file to Moodle file storage
        $storedfile = $fs->create_file_from_pathname($filerecord, $file['tmp_name']);

        if (!$storedfile) {
            // Rollback all previously stored files
            foreach ($storedFiles as $sf) {
                $sf['file']->delete();
            }
            throw new moodle_exception('Failed to store file: ' . $file['name']);
        }

        // Get title and author for this file
        $title = isset($titles[$index]) ? clean_param($titles[$index], PARAM_TEXT) : '';
        $author = isset($authors[$index]) ? clean_param($authors[$index], PARAM_TEXT) : '';
        $isPhotograph = isset($isPhotographs[$index]) ? $isPhotographs[$index] : 'false';

        error_log("LectureBot Upload: File $index - Title: '$title', Author: '$author', Is Scanned: '$isPhotograph'");

        // Prepare database record
        $record = new stdClass();
        $record->courseid = $courseid;
        $record->sectionid = $sectionid;
        $record->filename = $storedfile->get_filename();
        $record->title = $title ?: '';
        $record->author = $author ?: '';
        $record->fileitemid = $itemid;
        $record->filesize = $storedfile->get_filesize();
        $record->is_scanned = ($isPhotograph === 'true') ? 1 : 0;
        $record->batch_id = null; // Will be set after batch creation
        $record->timecreated = time();
        $record->timemodified = time();

        // Store for later batch processing
        $storedFiles[] = [
            'file' => $storedfile,
            'record' => $record,
            'index' => $index,
            'title' => $record->title,
            'author' => $record->author
        ];
    }

    // Release session lock early so other requests (like concurrent uploads) aren't blocked
    // while we wait for the potentially slow backend upload
    \core\session\manager::write_close();

    // Get user's owner UUID for credit tracking
    $userUuid = null;
    try {
        // First try to get user's personal wallet UUID
        $userUuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $USER->id);

        if (empty($userUuid)) {
            // If no personal wallet, check if user is admin and use organization wallet
            $context = \context_system::instance();
            if (has_capability('moodle/site:config', $context, $USER->id)) {
                $userUuid = get_config('local_lecturebot', 'org_wallet_owner_id');
                if (!empty($userUuid)) {
                    error_log("LectureBot: User is admin, using organization wallet UUID for upload");
                }
            }
        }
    } catch (\Exception $e) {
        // Continue anyway, backend will return appropriate error if UUID is required
        error_log("LectureBot: Failed to get user UUID: " . $e->getMessage());
    }

    // ===== UPLOAD PDFs TO BACKEND API (if enabled) =====
    $uploadResults = [];

    if (defined('LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD') && LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD) {
        try {
            // Get tenant ID and regen count
            $tenantConfig = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
            $tenantId = is_numeric($tenantConfig) ? (int) $tenantConfig : 1;
            $regenCount = get_azure_regen_count($courseid, $sectionid);

            // ---------------------------------------------------------
            // STEP 1: Start Batch Upload (ONCE for all files)
            // ---------------------------------------------------------
            $expectedUploads = count($storedFiles);
            $startBatchParams = [
                'organization_id' => $tenantId,
                'course_id' => $courseid,
                'chapter_id' => $sectionid,
                'regen_count' => $regenCount,
                'expected_uploads' => $expectedUploads
            ];

            $startBatchUrl = LECTUREBOT_API_START_BATCH_UPLOAD . '?' . http_build_query($startBatchParams, '', '&');
            error_log("LectureBot: Starting batch upload for $expectedUploads files: " . $startBatchUrl);

            // Get API Key from settings
            $apiKey = get_config('local_lecturebot', 'api_key');

            // Initialize cURL for start_batch_upload
            $chBatch = curl_init($startBatchUrl);
            curl_setopt_array($chBatch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => '',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER => [
                    'X-API-key: ' . $apiKey
                ]
            ]);

            $batchResponse = curl_exec($chBatch);
            $batchHttpCode = curl_getinfo($chBatch, CURLINFO_HTTP_CODE);

            if (curl_errno($chBatch)) {
                $batchErr = curl_error($chBatch);
                curl_close($chBatch);
                throw new moodle_exception('Failed to start batch upload: ' . $batchErr);
            }
            curl_close($chBatch);

            if ($batchHttpCode === 401) {
                error_log('LectureBot: Start batch failed (HTTP 401): API key missing or incorrect');
                throw new \moodle_exception('API key is missing or incorrect.
                Please check your settings.');
            } elseif ($batchHttpCode !== 200) {
                error_log(
                    'LectureBot: Start batch failed (HTTP ' .
                    $batchHttpCode .
                    '): ' .
                    $batchResponse
                );
                throw new moodle_exception(
                    'Start batch upload failed (HTTP ' .
                    $batchHttpCode .
                    '): ' .
                    $batchResponse
                );
            }

            $batchData = json_decode($batchResponse, true);
            if (!$batchData || !isset($batchData['batch_id'])) {
                error_log('LectureBot: Invalid batch response: ' . $batchResponse);
                throw new moodle_exception('Invalid response from start_batch_upload');
            }

            $batchId = $batchData['batch_id'];
            error_log("LectureBot: Batch started successfully. Batch ID: $batchId");

            // ---------------------------------------------------------
            // STEP 2: Upload each PDF to the same batch
            // ---------------------------------------------------------
            foreach ($storedFiles as $fileData) {
                $storedfile = $fileData['file'];
                $index = $fileData['index'];
                $title = $fileData['title'];
                $author = $fileData['author'];

                $uploadResult = [
                    'filename' => $storedfile->get_filename(),
                    'index' => $index,
                    'success' => false,
                    'error' => null,
                    'db_id' => null
                ];

                try {
                    // Get the actual file content from Moodle storage
                    $pdfContent = $storedfile->get_content();

                    // Prepare the API URL with all required params
                    $queryParams = [
                        'batch_id' => $batchId,
                        'course_id' => $courseid,
                        'organization_id' => $tenantId,
                        'chapter_id' => $sectionid,
                        'regen_count' => $regenCount,
                        'author' => $author,
                        'title' => $title
                    ];

                    // Add user_id for credit tracking
                    if ($userUuid) {
                        $queryParams['user_id'] = $userUuid;
                    }

                    $uploadApiUrl = LECTUREBOT_API_UPLOAD_PDF . '?' . http_build_query($queryParams, '', '&');
                    error_log("LectureBot: Uploading PDF $index to backend: " . $storedfile->get_filename());

                    // Create a temporary file with the PDF content
                    $tempFilePath = $CFG->tempdir . '/lecturebot_upload_' . $fileData['record']->fileitemid . '.pdf';
                    file_put_contents($tempFilePath, $pdfContent);

                    // Use CURLFile for proper multipart/form-data upload
                    $cfile = new CURLFile($tempFilePath, 'application/pdf', $storedfile->get_filename());

                    // Get API Key from settings
                    $apiKey = get_config('local_lecturebot', 'api_key');

                    // Initialize cURL to upload to backend
                    $ch = curl_init($uploadApiUrl);
                    curl_setopt_array($ch, [
                        CURLOPT_POST => true,
                        CURLOPT_POSTFIELDS => ['file' => $cfile],
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_TIMEOUT => 120,
                        CURLOPT_CONNECTTIMEOUT => 20,
                        CURLOPT_SSL_VERIFYPEER => false,
                        CURLOPT_FOLLOWLOCATION => true,
                        CURLOPT_POSTREDIR => 3,
                        CURLOPT_HTTPHEADER => [
                            'X-API-key: ' . $apiKey
                        ]
                    ]);

                    $backendResponse = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

                    if (curl_errno($ch)) {
                        $curlError = curl_error($ch);
                        curl_close($ch);
                        @unlink($tempFilePath);
                        throw new \moodle_exception('cURL error: ' . $curlError);
                    }

                    curl_close($ch);
                    @unlink($tempFilePath);

                    error_log("LectureBot: Backend API response for file $index (HTTP $httpCode): " . $backendResponse);

                    // Check success
                    if ($httpCode === 200 || $httpCode === 201) {
                        // Backend upload succeeded - add batch_id and insert DB record
                        $fileData['record']->batch_id = $batchId;
                        $dbId = $DB->insert_record('local_lecturebot_sources', $fileData['record']);
                        $uploadResult['success'] = true;
                        $uploadResult['db_id'] = $dbId;
                        error_log(
                            "LectureBot: Successfully uploaded
                             file $index to backend and saved to DB (ID: $dbId, Batch: $batchId)"
                        );
                    } elseif ($httpCode === 401) {
                        throw new \moodle_exception('API key is missing or incorrect.
                        Please check your settings.');
                    } else {
                        $backendData = json_decode($backendResponse, true);
                        if (isset($backendData['detail'])) {
                            $errorMsg = is_string($backendData['detail']) ?
                                $backendData['detail'] : json_encode($backendData['detail']);
                        } else {
                            $errorMsg = 'Backend returned HTTP ' . $httpCode;
                        }
                        throw new \moodle_exception($errorMsg);
                    }

                } catch (Exception $fileError) {
                    // This file failed - log error and clean up its Moodle file
                    error_log("LectureBot: Failed to upload file $index: " . $fileError->getMessage());
                    $uploadResult['error'] = $fileError->getMessage();
                    $storedfile->delete();
                }

                $uploadResults[] = $uploadResult;
            }

        } catch (Exception $backendError) {
            // Batch creation failed - Clean up all Moodle files and records
            error_log('LectureBot: Batch creation error: ' . $backendError->getMessage());

            foreach ($storedFiles as $fileData) {
                $fileData['file']->delete();
            }

            $errorMessage = $backendError->getMessage();
            $isApiKeyError = strpos($errorMessage, 'API key is missing or incorrect') !== false;

            http_response_code($isApiKeyError ? 401 : 500);
            echo json_encode([
                'status' => 'error',
                'error' => $isApiKeyError ? $errorMessage : 'Failed to create batch upload: ' . $errorMessage
            ]);
            exit;
        }
    } else {
        // Backend upload disabled - insert all records to DB
        error_log('LectureBot: Backend PDF upload is disabled');
        foreach ($storedFiles as $fileData) {
            $dbId = $DB->insert_record('local_lecturebot_sources', $fileData['record']);
            $uploadResults[] = [
                'filename' => $fileData['file']->get_filename(),
                'index' => $fileData['index'],
                'success' => true,
                'error' => null,
                'db_id' => $dbId
            ];
        }
    }

    // Prepare response with detailed status for each file
    $successfulUploads = [];
    $failedUploads = [];

    foreach ($uploadResults as $result) {
        if ($result['success']) {
            $fileData = $storedFiles[$result['index']];
            $successfulUploads[] = [
                'id' => $result['db_id'],
                'filename' => $result['filename'],
                'title' => $fileData['title'],
                'author' => $fileData['author'],
                'filesize' => $fileData['record']->filesize,
                'sectionid' => $sectionid,
                'timecreated' => $fileData['record']->timecreated,
                'fileitemid' => $fileData['record']->fileitemid
            ];
        } else {
            $failedUploads[] = [
                'filename' => $result['filename'],
                'index' => $result['index'],
                'error' => $result['error']
            ];
        }
    }

    $responseData = [
        'status' => 'success',
        'batch_id' => isset($batchId) ? $batchId : null,
        'total_files' => count($storedFiles),
        'successful' => count($successfulUploads),
        'failed' => count($failedUploads),
        'sources' => $successfulUploads
    ];

    if (!empty($failedUploads)) {
        $responseData['failures'] = $failedUploads;
    }

    // Return success with file details
    echo json_encode($responseData);

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Fatal error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()
    ]);
}
