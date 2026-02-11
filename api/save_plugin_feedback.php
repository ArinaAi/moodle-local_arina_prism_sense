<?php
/**
 * Save plugin feedback to PostgreSQL database
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once __DIR__ . '/../../../config.php';
require_once __DIR__ . '/../lib_azure_storage.php';

use local_lecturebot\exception\ValidationException;

// User must be logged in
require_login();
require_sesskey();

header('Content-Type: application/json');

// PostgreSQL credentials are now loaded from .env via configurator_azure.php
// Constants: PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD

/**
 * Upload file to Azure Blob Storage
 *
 * @param array $file File from $_FILES
 * @param int $ownerId Owner/Tenant ID
 * @param int $userId User ID
 * @return array ['success' => bool, 'url' => string|null, 'filename' => string|null, 'error' => string|null]
 */
function uploadToAzureBlob($file, $ownerId, $userId)
{
    // Initialize default error result
    $result = [
        'success' => false,
        'url' => null,
        'filename' => null,
        'error' => null
    ];
    
    try {
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $result['error'] = 'File upload error: ' . $file['error'];
        } else {
            // Validate file type (only images)
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            if (!in_array($mimeType, $allowedTypes)) {
                $result['error'] = 'Invalid file type. Only images are allowed.';
            } elseif ($file['size'] > 5 * 1024 * 1024) {
                // Validate file size (max 5MB)
                $result['error'] = 'File too large. Maximum size is 5MB.';
            } elseif (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
                // Get Azure credentials from environment
                $result['error'] = 'Azure credentials not configured';
            } else {
                // All validations passed, proceed with upload
                $accountName = AZURE_STORAGE_ACCOUNT_NAME;
                $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
                
                // Use prism-feedback container with tenant-based folder structure
                $containerName = 'prism-feedback';
                
                // Generate unique filename with pattern: {timestamp}_{owner_id}_{user_id}_{random}.{ext}
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $timestamp = time();
                // Use cryptographically secure random bytes instead of MD5
                $random = bin2hex(random_bytes(3)); // 3 bytes = 6 hex characters
                $filename = "{$timestamp}_{$ownerId}_{$userId}_{$random}.{$extension}";
                
                // Organize by tenant: tenant-{owner_id}/{filename}
                $blobName = "tenant-{$ownerId}/{$filename}";
                
                // Read file content
                $content = file_get_contents($file['tmp_name']);
                
                // Upload to Azure using existing helper function
                $uploadSuccess = upload_to_azure_blob(
                    $accountName,
                    $containerName,
                    $accountKey,
                    $blobName,
                    $content,
                    $mimeType
                );
                
                if ($uploadSuccess) {
                    $blobUrl = get_azure_blob_url($accountName, $containerName, $blobName);
                    $result = [
                        'success' => true,
                        'url' => $blobUrl,
                        'filename' => $filename,
                        'error' => null
                    ];
                } else {
                    $result['error'] = 'Failed to upload to Azure Blob Storage';
                }
            }
        }
        
    } catch (Exception $e) {
        error_log('Azure Blob upload error: ' . $e->getMessage());
        $result['error'] = 'Failed to upload screenshot: ' . $e->getMessage();
    }
    
    return $result;
}

try {
    // Parse form data (frontend always sends multipart/form-data)
    $has_file = isset($_FILES['screenshot']) && $_FILES['screenshot']['error'] !== UPLOAD_ERR_NO_FILE;
    
    $user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : null;
    $owner_id = isset($_POST['owner_id']) ? (int)$_POST['owner_id'] : null;
    $issue_types = isset($_POST['issue_types']) ? $_POST['issue_types'] : null;
    $issue_description = isset($_POST['issue_description']) ? $_POST['issue_description'] : null;
    
    // Validate required fields
    if (!$user_id) {
        throw new ValidationException('Missing required field: user_id');
    }
    
    if (!$issue_types) {
        throw new ValidationException('Missing required field: issue_types');
    }
    
    if (!$issue_description || trim($issue_description) === '') {
        throw new ValidationException('Missing required field: issue_description');
    }
    
    // Validate issue_types is an array
    if (is_string($issue_types)) {
        $issue_types = json_decode($issue_types, true);
    }
    
    if (!is_array($issue_types) || empty($issue_types)) {
        throw new ValidationException('issue_types must be a non-empty array');
    }
    
    
    // Handle screenshot upload if present
    $screenshot_url = null;
    $screenshot_filename = null;
    
    if ($has_file) {
        $upload_result = uploadToAzureBlob($_FILES['screenshot'], $owner_id, $user_id);
        
        if ($upload_result['success']) {
            $screenshot_url = $upload_result['url'];
            $screenshot_filename = $upload_result['filename'];
        } else {
            // Log the error but don't fail the entire feedback submission
            error_log('Screenshot upload failed: ' . $upload_result['error']);
            // Continue without screenshot - feedback is more important than the image
        }
    }
    
    // Connect to PostgreSQL
    $dsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=%s',
        PG_HOST,
        PG_PORT,
        PG_DATABASE
    );
    
    $pdo = new PDO($dsn, PG_USER, PG_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Begin transaction
    $pdo->beginTransaction();
    
    try {
        // Prepare SQL statement
        $sql = "INSERT INTO product_feedback (
                    user_id,
                    owner_id,
                    product_name,
                    issue_types,
                    issue_description,
                    screenshot_url,
                    screenshot_filename
                ) VALUES (
                    :user_id,
                    :owner_id,
                    :product_name,
                    :issue_types,
                    :issue_description,
                    :screenshot_url,
                    :screenshot_filename
                ) RETURNING id";
        
        $stmt = $pdo->prepare($sql);
        
        // Execute with parameters
        $stmt->execute([
            ':user_id' => $user_id,
            ':owner_id' => $owner_id,
            ':product_name' => 'PRISM_SENSE', // Hardcoded as per requirements
            ':issue_types' => json_encode($issue_types),
            ':issue_description' => trim($issue_description),
            ':screenshot_url' => $screenshot_url,
            ':screenshot_filename' => $screenshot_filename,
        ]);
        
        // Get the inserted ID
        $result = $stmt->fetch();
        $feedback_id = $result['id'];
        
        // Commit transaction
        $pdo->commit();
        
        // Log success
        error_log(sprintf(
            'Plugin feedback saved successfully. ID: %d, User: %d, Owner: %d',
            $feedback_id,
            $user_id,
            $owner_id
        ));
        
        // Return success response
        echo json_encode([
            'success' => true,
            'feedback_id' => $feedback_id,
            'message' => 'Feedback submitted successfully'
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log('PostgreSQL Error in save_plugin_feedback: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
    
} catch (Exception $e) {
    error_log('Error in save_plugin_feedback: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
