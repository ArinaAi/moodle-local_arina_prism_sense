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
    require_capability('moodle/course:update', $context);
    require_sesskey();

    
    // Check if file was uploaded
    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        throw new moodle_exception('No file uploaded or upload error');
    }
    
    $file = $_FILES['pdf'];
    
    // Validate file type
    if ($file['type'] !== 'application/pdf') {
        throw new moodle_exception('Only PDF files are allowed');
    }
    
    // Validate file size (max 50MB)
    $maxsize = 50 * 1024 * 1024;
    if ($file['size'] > $maxsize) {
        throw new moodle_exception('File size exceeds 50MB limit');
    }
    
    // Check existing sources for this section (max 3)
    $existingcount = $DB->count_records('local_lecturebot_sources', [
        'courseid' => $courseid,
        'sectionid' => $sectionid
    ]);
    
    if ($existingcount >= 3) {
        throw new moodle_exception('Maximum 3 PDFs per section reached');
    }
    
    // Generate unique itemid for this file
    $itemid = time() . random_int(1000, 9999);
    
    // Prepare file record
    $filerecord = array(
        'contextid' => $context->id,
        'component' => 'local_lecturebot',
        'filearea'  => 'sources',
        'itemid'    => $itemid,
        'filepath'  => '/',
        'filename'  => clean_filename($file['name']),
        'userid'    => $USER->id
    );
    
    // Save file to Moodle file storage
    $fs = get_file_storage();
    $storedfile = $fs->create_file_from_pathname($filerecord, $file['tmp_name']);
    
    if (!$storedfile) {
        throw new moodle_exception('Failed to store file');
    }
    
    // Get title and author
    $title = optional_param('title', '', PARAM_TEXT);
    $author = optional_param('author', '', PARAM_TEXT);
    
    // Debug logging
    error_log("LectureBot Upload: Title param: '$title', Author param: '$author'");
    
    // Fallback to POST directly if empty (just in case)
    if ($title === '') {
        $title = isset($_POST['title']) ? clean_param($_POST['title'], PARAM_TEXT) : '';
        error_log("LectureBot Upload: Title fallback to POST: '$title'");
    }
    if ($author === '') {
        $author = isset($_POST['author']) ? clean_param($_POST['author'], PARAM_TEXT) : '';
        error_log("LectureBot Upload: Author fallback to POST: '$author'");
    }

    // Insert record into database
    $record = new stdClass();
    $record->courseid = $courseid;
    $record->sectionid = $sectionid;
    $record->filename = $storedfile->get_filename();
    // Ensure we never save NULL
    $record->title = $title ?: '';
    $record->author = $author ?: '';
    $record->fileitemid = $itemid;
    $record->filesize = $storedfile->get_filesize();
    $record->timecreated = time();
    $record->timemodified = time();
    
    $id = $DB->insert_record('local_lecturebot_sources', $record);

    // Release session lock early so other requests (like concurrent uploads) aren't blocked
    // while we wait for the potentially slow backend upload
    \core\session\manager::write_close();
    
    // ===== UPLOAD PDF TO BACKEND API (if enabled) =====
    // ===== UPLOAD PDF TO BACKEND API (if enabled) =====
    if (defined('LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD') && LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD) {
        try {
            // Get the actual file content from Moodle storage
            $pdfContent = $storedfile->get_content();
            
            // Get tenant ID
            $tenantConfig = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
            $tenantId = is_numeric($tenantConfig) ? (int)$tenantConfig : 1;
            
            // Get regen count
            $regenCount = get_azure_regen_count($courseid, $sectionid);
            
            // ---------------------------------------------------------
            // STEP 1: Start Batch Upload
            // url: /start_batch_upload
            // ---------------------------------------------------------
            $startBatchParams = [
                'organization_id' => $tenantId,
                'course_id' => $courseid,
                'chapter_id' => $sectionid,
                'regen_count' => $regenCount,
                'expected_uploads' => 1 // We treat each file as a batch of 1
            ];
            
            $startBatchUrl = LECTUREBOT_API_START_BATCH_UPLOAD . '?' . http_build_query($startBatchParams, '', '&');
            error_log('LectureBot: Starting batch upload: ' . $startBatchUrl);
            
            // Initialize cURL for start_batch_upload
            $chBatch = curl_init($startBatchUrl);
            curl_setopt_array($chBatch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => '', // POST with query params requires empty body or just params
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30, // Short timeout for metadata call
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_FOLLOWLOCATION => true
            ]);
            
            $batchResponse = curl_exec($chBatch);
            $batchHttpCode = curl_getinfo($chBatch, CURLINFO_HTTP_CODE);
            
            if (curl_errno($chBatch)) {
                $batchErr = curl_error($chBatch);
                curl_close($chBatch);
                throw new moodle_exception('Failed to start batch upload: ' . $batchErr);
            }
            curl_close($chBatch);
            
            if ($batchHttpCode !== 200) {
                error_log('LectureBot: Start batch failed (HTTP ' . $batchHttpCode . '): ' . $batchResponse);
                // Include response in exception to show detail to user
                throw new moodle_exception('Start batch upload failed (HTTP ' . $batchHttpCode . '): ' .
                    $batchResponse);
            }
            
            $batchData = json_decode($batchResponse, true);
            if (!$batchData || !isset($batchData['batch_id'])) {
                 error_log('LectureBot: Invalid batch response: ' . $batchResponse);
                 throw new moodle_exception('Invalid response from start_batch_upload');
            }
            
            $batchId = $batchData['batch_id'];
            error_log('LectureBot: Batch started successfully. Batch ID: ' . $batchId);

            // ---------------------------------------------------------
            // STEP 2: Upload PDF
            // url: /uploadpdf
            // ---------------------------------------------------------
            
            // Prepare the API URL with all required params
            $queryParams = [
                'batch_id' => $batchId,
                'course_id' => $courseid,
                'organization_id' => $tenantId,
                'chapter_id' => $sectionid,
                'regen_count' => $regenCount,
                'author' => $record->author,
                'title' => $record->title
            ];
            // Note: Use 'uploadpdf' endpoint now instead of 'upload' or 'upload_source'
            // Check api/config_api.php to ensure LECTUREBOT_API_UPLOAD_PDF is set correctly
            $uploadApiUrl = LECTUREBOT_API_UPLOAD_PDF . '?' . http_build_query($queryParams, '', '&');
            
            error_log('LectureBot: Uploading PDF to backend API: ' . $uploadApiUrl);
            
            // Create a temporary file with the PDF content
            $tempFilePath = $CFG->tempdir . '/lecturebot_upload_' . $itemid . '.pdf';
            file_put_contents($tempFilePath, $pdfContent);
            
            // Use CURLFile for proper multipart/form-data upload
            $cfile = new CURLFile($tempFilePath, 'application/pdf', $storedfile->get_filename());
            
            // Initialize cURL to upload to backend
            $ch = curl_init($uploadApiUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => ['file' => $cfile],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 120, // Increased timeout for file upload
                CURLOPT_CONNECTTIMEOUT => 20,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_POSTREDIR => 3,
            ]);
            
            $backendResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if (curl_errno($ch)) {
                $curlError = curl_error($ch);
                curl_close($ch);
                @unlink($tempFilePath); // Clean up temp file
                error_log('LectureBot: Backend upload failed - cURL error: ' . $curlError);
                throw new moodle_exception('Failed to upload PDF to backend: ' . $curlError);
            }
            
            curl_close($ch);
            @unlink($tempFilePath); // Clean up temp file
            
            error_log('LectureBot: Backend API response (HTTP ' . $httpCode . '): ' . $backendResponse);
            
            // Parse backend response
            $backendData = json_decode($backendResponse, true);
            
            // Check success
            $isSuccess = false;
            if ($httpCode === 200 || $httpCode === 201) {
                 // For uploadpdf, a 200 OK often means it was queued
                 $isSuccess = true;
            }
            
            if (!$isSuccess) {
                // ... (Existing error handling reused/adapted)
                $errorMsg = 'Backend returned unsuccessful response (HTTP ' . $httpCode . ')';
                if (isset($backendData['detail'])) {
                    $errorMsg .= ': ' . (is_string($backendData['detail']) ?
                        $backendData['detail'] : json_encode($backendData['detail']));
                }
                error_log('LectureBot: Backend upload failed: ' . $errorMsg);
                throw new moodle_exception($errorMsg);
            }
            
            error_log('LectureBot: Successfully uploaded PDF to backend API');
            
        } catch (Exception $backendError) {
            // Backend upload failed - Clean up Moodle record
            error_log('LectureBot: Backend upload error: ' . $backendError->getMessage());
            $storedfile->delete();
            $DB->delete_records('local_lecturebot_sources', ['id' => $id]);
            
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'error' => 'Failed to upload PDF to backend: ' . $backendError->getMessage()
            ]);
            exit;
        }
    } else {
        error_log('LectureBot: Backend PDF upload is disabled (LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD = false)');
    }
    
    // Return success with file details (only if both Moodle AND backend uploads succeeded)
    echo json_encode([
        'status' => 'success',
        'source' => [
            'id' => $id,
            'filename' => $record->filename,
            'title' => $record->title,
            'author' => $record->author,
            'filesize' => $record->filesize,
            'sectionid' => $sectionid,
            'timecreated' => $record->timecreated,
            'fileitemid' => $itemid
        ]
    ]);
    
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Fatal error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()
    ]);
}
