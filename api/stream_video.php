<?php
/**
 * API endpoint to securely stream video from Azure
 * Redirects to a temporary SAS URL
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../configurator_azure.php');
require_once(__DIR__ . '/../lib_azure_storage.php');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $contentid = required_param('contentid', PARAM_INT);
    
    // Require login
    require_login($courseid);
    // Any enrolled user can view content
    
    // Get content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);
    
    if ($content->courseid != $courseid) {
        throw new moodle_exception('Content does not belong to this course');
    }
    
    // Parse generation data to find video
    $genData = json_decode($content->generationdata, true);
    
    $blobName = null;
    $containerName = null;
    
    // Check new structure (Azure Folder)
    if (isset($genData['azure_blob_name'])) {
        $blobName = $genData['azure_blob_name'];
        $containerName = $genData['azure_container'] ?? null;
    } elseif (isset($genData['video_file'])) {
        // Fallback or local? If local file path, we can't stream via Azure SAS easily unless uploaded
        // But the plan assumes Azure storage.
        // If it's a local file in Moodle (tempdir), we might need send_file
        // But let's assume standard Azure flow for "Video" type content
    }
    
    if (!$blobName) {
        throw new moodle_exception('Video file not found in content record');
    }
    
    // Azure Credentials
    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
    $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 1;
    
    if (!$containerName) {
         $containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
    }
    
    // Generate SAS Token (Read Only, 60 minutes)
    $sasToken = generate_blob_sas_token($accountName, $containerName, $blobName, $accountKey);
    
    // Construct URL
    $azureUrl = get_azure_blob_url($accountName, $containerName, $blobName) . $sasToken;
    
    // Redirect to the signed URL
    redirect($azureUrl);
    
} catch (Exception $e) {
    // Return simple error or image placeholder
    http_response_code(404);
    die('Video not found or access denied: ' . $e->getMessage());
}
