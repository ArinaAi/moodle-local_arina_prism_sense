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
    
    // Insert record into database
    $record = new stdClass();
    $record->courseid = $courseid;
    $record->sectionid = $sectionid;
    $record->filename = $storedfile->get_filename();
    $record->fileitemid = $itemid;
    $record->filesize = $storedfile->get_filesize();
    $record->timecreated = time();
    $record->timemodified = time();
    
    $id = $DB->insert_record('local_lecturebot_sources', $record);
    
    // ===== UPLOAD PDF TO BACKEND API (if enabled) =====
    if (defined('LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD') && LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD) {
        try {
            // Get the actual file content from Moodle storage
            $pdfContent = $storedfile->get_content();
            
            // Get tenant ID
            $tenantConfig = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
            $tenantId = is_numeric($tenantConfig) ? (int)$tenantConfig : 1;
            
            // Get regen count (next available)
            // Note: For upload, we use the next available count to ensure it lands in a new folder if needed
            // or aligns with the next generation. Check if we should use current or next.
            // Assuming next since it's a new upload.
            $regenCount = get_azure_regen_count($courseid, $sectionid, $tenantId);
            
            // Prepare the API URL with all required params
            // Params: course_id, organization_id, chapter_id, regen_count
            $queryParams = [
                'course_id' => $courseid,
                'organization_id' => $tenantId,
                'chapter_id' => $sectionid,
                'regen_count' => $regenCount
            ];
            $apiUrl = LECTUREBOT_API_UPLOAD_PDF . '?' . http_build_query($queryParams, '', '&');
            
            error_log('LectureBot: Uploading PDF to backend API: ' . $apiUrl);
            
            // Create a temporary file with the PDF content (cURL needs a file path for multipart upload)
            $tempFilePath = $CFG->tempdir . '/lecturebot_upload_' . $itemid . '.pdf';
            file_put_contents($tempFilePath, $pdfContent);
            
            // Use CURLFile for proper multipart/form-data upload
            $cfile = new CURLFile($tempFilePath, 'application/pdf', $storedfile->get_filename());
            
            // Initialize cURL to upload to backend
            $ch = curl_init($apiUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => ['file' => $cfile], // Backend expects 'file' not 'pdf'
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_CONNECTTIMEOUT => 20,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_POSTREDIR => 3, // Preserve POST on redirects (CURL_REDIR_POST_ALL)
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
            
            // Log parsed data for debugging
            error_log('LectureBot: Parsed backend data: ' . print_r($backendData, true));
            
            // Check if backend upload was successful
            // Accept multiple success indicators:
            // 1. {"success": true}
            // 2. {"Success": true}
            // 3. HTTP 200 with {"message": "...successfully..."}
            // 4. HTTP 200 with any response (some APIs don't return structured data)
            $isSuccess = false;
            
            if ($httpCode === 200) {
                if ($backendData) {
                    // Check for explicit success field or message
                    if ((isset($backendData['success']) && $backendData['success'] === true) ||
                        (isset($backendData['Success']) && $backendData['Success'] === true) ||
                        (isset($backendData['message']) &&
                            (stripos($backendData['message'], 'success') !== false ||
                             stripos($backendData['message'], 'uploaded') !== false))) {
                        $isSuccess = true;
                    }
                } else {
                    // HTTP 200 with empty/invalid JSON - assume success
                    $isSuccess = true;
                }
            }
            
            if (!$isSuccess) {
                $errorMsg = 'Backend returned unsuccessful response';
                
                // Add more context to error message
                if (isset($backendData['error'])) {
                    $errorMsg .= ': ' . $backendData['error'];
                } elseif (isset($backendData['message'])) {
                    $errorMsg .= ': ' . $backendData['message'];
                } elseif (isset($backendData['detail'])) {
                    // FastAPI validation errors
                    $errorMsg .= ': ' . json_encode($backendData['detail']);
                } else {
                    $errorMsg .= ' (HTTP ' . $httpCode . ')';
                    $errorMsg .= '. Response: ' . substr($backendResponse, 0, 200);
                }
                
                error_log('LectureBot: Backend upload failed: ' . $errorMsg);
                throw new moodle_exception('Backend API upload failed: ' . $errorMsg);
            }
            
            error_log('LectureBot: Successfully uploaded PDF to backend API');
            
        } catch (Exception $backendError) {
            // Backend upload failed - we should probably delete the Moodle record and file
            // to keep things consistent
            error_log('LectureBot: Backend upload error: ' . $backendError->getMessage());
            
            // Clean up Moodle storage
            $storedfile->delete();
            $DB->delete_records('local_lecturebot_sources', ['id' => $id]);
            
            // Return error to frontend
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
