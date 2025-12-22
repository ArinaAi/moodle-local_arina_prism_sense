<?php
/**
 * Azure Blob Storage Helper Functions for Slide Images
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/config_azure.php');

/**
 * Upload slide images to Azure Blob Storage
 * @param array $slideFiles Array of slide file paths
 * @param string $previewId Unique identifier for this set of slides
 * @return bool True if successful
 */
function upload_slides_to_azure($slideFiles, $previewId)
{
    try {
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        $containerName = AZURE_BLOB_CONTAINER_NAME;
        $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
        
        $uploadedCount = 0;
        foreach ($slideFiles as $slideFile) {
            $filename = basename($slideFile);
            $blobName = 'slides/' . $previewId . '/' . $filename;
            
            // Read file content
            $content = file_get_contents($slideFile);
            if ($content === false) {
                error_log('LectureBot: Failed to read slide file: ' . $slideFile);
                continue;
            }
            
            // Upload to Azure
            $result = upload_to_azure_blob($accountName, $containerName, $accountKey, $blobName, $content, 'image/png');
            
            if ($result) {
                $uploadedCount++;
                error_log('LectureBot: Uploaded slide to Azure: ' . $blobName);
            } else {
                error_log('LectureBot: Failed to upload slide to Azure: ' . $blobName);
            }
        }
        
        error_log('LectureBot: Uploaded ' . $uploadedCount . ' of ' . count($slideFiles) . ' slides to Azure');
        return $uploadedCount > 0;
    } catch (Exception $e) {
        error_log('LectureBot: Error uploading slides to Azure: ' . $e->getMessage());
        return false;
    }
}

/**
 * Download slides from Azure Blob Storage
 * @param string $previewId Unique identifier for this set of slides
 * @return array Array of slide data with Azure URLs
 */
function download_slides_from_azure($previewId)
{
    try {
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        $containerName = AZURE_BLOB_CONTAINER_NAME;
        
        $images = [];
        $slideNumber = 0;
        
        // Try to fetch up to 100 slides (should be more than enough)
        for ($i = 0; $i < 100; $i++) {
            $filename = sprintf('slide_%03d.png', $i);
            $blobName = 'slides/' . $previewId . '/' . $filename;
            
            // Generate Azure URL
            $azureUrl = get_azure_blob_url($accountName, $containerName, $blobName);
            
            // Check if blob exists
            if (check_azure_blob_exists($azureUrl)) {
                $images[] = [
                    'filename' => $filename,
                    'data' => $azureUrl, // Return URL instead of base64
                    'slideNumber' => ++$slideNumber
                ];
            } else {
                // No more slides found
                break;
            }
        }
        
        error_log('LectureBot: Found ' . count($images) . ' slides in Azure for preview ID: ' . $previewId);
        return $images;
    } catch (Exception $e) {
        error_log('LectureBot: Error downloading slides from Azure: ' . $e->getMessage());
        return [];
    }
}

/**
 * Upload a blob to Azure Blob Storage
 * @param string $accountName Storage account name
 * @param string $containerName Container name
 * @param string $accountKey Storage account key
 * @param string $blobName Blob name (path)
 * @param string $content File content
 * @param string $contentType Content type
 * @return bool True if successful
 */
function upload_to_azure_blob($accountName, $containerName, $accountKey, $blobName, $content, $contentType)
{
    try {
        $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
        
        $date = gmdate('D, d M Y H:i:s T');
        $contentLength = strlen($content);
        
        // Create signature
        $stringToSign = "PUT\n" .
                       "\n" .  // Content-Encoding
                       "\n" .  // Content-Language
                       "{$contentLength}\n" .
                       "\n" .  // Content-MD5
                       "{$contentType}\n" .
                       "\n" .  // Date
                       "\n" .  // If-Modified-Since
                       "\n" .  // If-Match
                       "\n" .  // If-None-Match
                       "\n" .  // If-Unmodified-Since
                       "\n" .  // Range
                       "x-ms-blob-type:BlockBlob\n" .
                       "x-ms-date:{$date}\n" .
                       "x-ms-version:2021-08-06\n" .
                       "/{$accountName}/{$containerName}/{$blobName}";
        
        $signature = base64_encode(hash_hmac('sha256', $stringToSign, base64_decode($accountKey), true));
        
        $headers = [
            "Authorization: SharedKey {$accountName}:{$signature}",
            "x-ms-blob-type: BlockBlob",
            "x-ms-date: {$date}",
            "x-ms-version: 2021-08-06",
            "Content-Type: {$contentType}",
            "Content-Length: {$contentLength}"
        ];
        
        $ch = curl_init($blobUrl);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $content);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return true;
        } else {
            error_log('LectureBot: Azure upload failed with HTTP ' . $httpCode . ': ' . substr($response, 0, 500));
            return false;
        }
    } catch (Exception $e) {
        error_log('LectureBot: Error in upload_to_azure_blob: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get Azure Blob URL
 * @param string $accountName Storage account name
 * @param string $containerName Container name
 * @param string $blobName Blob name
 * @return string Azure blob URL
 */
function get_azure_blob_url($accountName, $containerName, $blobName)
{
    return "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
}

/**
 * Check if an Azure blob exists
 * @param string $blobUrl Blob URL
 * @return bool True if exists
 */
function check_azure_blob_exists($blobUrl)
{
    $ch = curl_init($blobUrl);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 200;
}

/**
 * Get all slide versions for a specific content ID
 * @return array Array of version info [timestamp, folder_name, slide_count]
 */
function get_slide_versions()
{
    try {
        
        // In a production environment, you would use Azure Storage SDK to list blobs
        // For now, this is a placeholder that would need Azure Blob List API
        
        // This would require implementing the Azure Blob List Blobs API
        // Which lists all blobs with a prefix like: slides/content_{contentid}_
        
        error_log('LectureBot: get_slide_versions not yet fully implemented - requires Azure Blob List API');
        
        // Return structure would be:
        // [
        //   ['timestamp' => 1734512345, 'folder' => 'content_123_1734512345', 'slides' => 15],
        //   ['timestamp' => 1734515678, 'folder' => 'content_123_1734515678', 'slides' => 12],
        // ]
        
        return [];
    } catch (Exception $e) {
        error_log('LectureBot: Error getting slide versions: ' . $e->getMessage());
        return [];
    }
}

/**
 * Count how many times slides were regenerated for a content ID
 * @return int Number of versions
 */
function count_slide_regenerations()
{
    $versions = get_slide_versions();
    return count($versions);
}

/**
 * Get the latest slide version for a content ID
 * @return array|null Latest version info or null
 */
function get_latest_slide_version()
{
    $versions = get_slide_versions();
    if (empty($versions)) {
        return null;
    }
    
    // Sort by timestamp descending
    usort($versions, function ($a, $b) {
        return $b['timestamp'] - $a['timestamp'];
    });
    
    return $versions[0];
}

/**
 * Restore slides from a specific version
 * @param int $contentid Content ID
 * @param int $timestamp Version timestamp to restore
 * @return array Array of slide URLs
 */
function restore_slide_version($contentid, $timestamp)
{
    $previewId = 'content_' . $contentid . '_' . $timestamp;
    return download_slides_from_azure($previewId);
}

