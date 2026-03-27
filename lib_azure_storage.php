<?php
/**
 * Azure Blob Storage Helper Functions for Slide Images
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/configurator_azure.php');

/**
 * Upload slide images to Azure Blob Storage
 * @param array $slideFiles Array of slide file paths
 * @param string $containerName Azure container name
 * @return bool True if successful
 */
function local_lecturebot_upload_slides_to_azure($slideFiles, $previewId, $containerName)
{
    try {
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
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
            $result = local_lecturebot_upload_to_azure_blob(
                $accountName,
                $containerName,
                $accountKey,
                $blobName,
                $content,
                'image/png'
            );
            
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
 * @param string $containerName Azure container name
 * @return array Array of slide data with Azure URLs
 */
function local_lecturebot_download_slides_from_azure($previewId, $containerName)
{
    try {
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        
        $images = [];
        $slideNumber = 0;
        
        // Try to fetch up to 100 slides (should be more than enough)
        for ($i = 0; $i < 100; $i++) {
            $filename = sprintf('slide_%03d.png', $i);
            $blobName = 'slides/' . $previewId . '/' . $filename;
            
            // Generate Azure URL
            $azureUrl = local_lecturebot_get_azure_blob_url($accountName, $containerName, $blobName);
            
            // Check if blob exists
            if (local_lecturebot_check_azure_blob_exists($azureUrl)) {
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
function local_lecturebot_upload_to_azure_blob(
    $accountName,
    $containerName,
    $accountKey,
    $blobName,
    $content,
    $contentType
) {
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
function local_lecturebot_get_azure_blob_url($accountName, $containerName, $blobName)
{
    return "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
}

/**
 * Check if an Azure blob exists
 * @param string $blobUrl Blob URL
 * @return bool True if exists
 */
function local_lecturebot_check_azure_blob_exists($blobUrl)
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
function local_lecturebot_get_slide_versions()
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
function local_lecturebot_count_slide_regenerations()
{
    $versions = local_lecturebot_get_slide_versions();
    return count($versions);
}

/**
 * Get the latest slide version for a content ID
 * @return array|null Latest version info or null
 */
function local_lecturebot_get_latest_slide_version()
{
    $versions = local_lecturebot_get_slide_versions();
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
 * @param int $contentid Content ID
 * @param int $timestamp Version timestamp to restore
 * @param string $containerName Azure container name
 * @return array Array of slide URLs
 */
function local_lecturebot_restore_slide_version($contentid, $timestamp, $containerName)
{
    $previewId = 'content_' . $contentid . '_' . $timestamp;
    return local_lecturebot_download_slides_from_azure($previewId, $containerName);
}

/**
 * Generate a SAS token for a blob
 * @param string $accountName Storage account name
 * @param string $containerName Container name
 * @param string $blobName Blob name
 * @param string $accountKey Account key
 * @return string SAS token query string (starting with ?)
 */
function local_lecturebot_generate_blob_sas_token($accountName, $containerName, $blobName, $accountKey)
{
    $signedPermissions = 'r'; // Read
    $signedStart = gmdate('Y-m-d\TH:i:s\Z', strtotime('-5 minutes'));
    $signedExpiry = gmdate('Y-m-d\TH:i:s\Z', strtotime('+2 hours')); // 2 hour expiry
    $signedService = 'b'; // Blob
    $signedVersion = '2020-04-08';
    $signedProtocol = 'https';
    
    // Canonicalized Resource: /blob/account/container/blob
    $canonicalizedResource = "/blob/{$accountName}/{$containerName}/{$blobName}";
    
    // String to sign order for 2020-04-08:
    // permissions, start, expiry, canonicalizedResource, identifier, ip, protocol, version,
    // resources, snapshot, encryption scope, cache control, disposition, encoding, language, type
    $stringToSign = $signedPermissions . "\n" .
                    $signedStart . "\n" .
                    $signedExpiry . "\n" .
                    $canonicalizedResource . "\n" .
                    "" . "\n" . // identifier
                    "" . "\n" . // ip
                    $signedProtocol . "\n" .
                    $signedVersion . "\n" .
                    $signedService . "\n" .
                    "" . "\n" . // snapshot
                    "\n" . // rscc
                    "\n" . // rscd
                    "\n" . // rsce
                    "\n" . // rscl
                    "";    // rsct
                    
    $signature = base64_encode(hash_hmac(
        'sha256',
        mb_convert_encoding($stringToSign, 'UTF-8'),
        base64_decode($accountKey),
        true
    ));
    
    $queryParams = [
        'sv' => $signedVersion,
        'st' => $signedStart,
        'se' => $signedExpiry,
        'sr' => $signedService,
        'sp' => $signedPermissions,
        'spr' => $signedProtocol,
        'sig' => $signature
    ];
    
    // MUST use '&' separator, otherwise Azure fails to parse
    return '?' . http_build_query($queryParams, '', '&');
}

/**
 * Execute Azure Blob List API call
 */
function local_lecturebot_execute_azure_blob_list_call($accountName, $accountKey, $containerName, $prefix)
{
    if (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
         error_log("LectureBot: Azure credentials not defined.");
         return null;
    }

    $url = "https://{$accountName}.blob.core.windows.net/{$containerName}" .
           "?restype=container&comp=list&delimiter=/&prefix={$prefix}";
    
    $date = gmdate('D, d M Y H:i:s T', time());
    $canonicalizedHeaders = "x-ms-date:$date\nx-ms-version:2020-04-08";
    $canonicalizedResource = "/{$accountName}/{$containerName}\ncomp:list\ndelimiter:/\n" .
                             "prefix:{$prefix}\nrestype:container";
    
    $stringToSign = "GET\n\n\n\n\n\n\n\n\n\n\n\n" .
                    $canonicalizedHeaders . "\n" .
                    $canonicalizedResource;
                    
    $utf8String = mb_convert_encoding($stringToSign, 'UTF-8', 'ISO-8859-1');
    $hash = hash_hmac('sha256', $utf8String, base64_decode($accountKey), true);
    $signature = base64_encode($hash);
    $authHeader = "SharedKey $accountName:$signature";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "x-ms-date: $date",
            "x-ms-version: 2020-04-08",
            "Authorization: $authHeader"
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 10
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("LectureBot Azure List failed: $httpCode. Response: " . substr($response, 0, 100));
        return null;
    }

    return $response;
}

/**
 * Parse Azure XML response to find max regen count
 */
function local_lecturebot_parse_azure_blob_list_response($response)
{
    $maxCount = -1;
    try {
        $xml = new SimpleXMLElement($response);
        if (!isset($xml->Blobs->BlobPrefix)) {
            error_log("LectureBot: No BlobPrefix found in XML");
            return 0;
        }

        foreach ($xml->Blobs->BlobPrefix as $prefixNode) {
            $dirName = (string)$prefixNode->Name;
            if (preg_match('/_(\d+)\/$/', $dirName, $matches)) {
                $count = (int)$matches[1];
                if ($count > $maxCount) {
                    $maxCount = $count;
                }
            }
        }
    } catch (Exception $e) {
        error_log("LectureBot XML Parse Error: " . $e->getMessage());
        return 0;
    }
    
    return $maxCount + 1;
}

/**
 * Check if a specific folder already contains generated content
 * Looks for lecture_content.json file
 */
function local_lecturebot_check_folder_has_generated_content($accountName, $accountKey, $containerName, $prefix)
{
    $hasContent = false;
    $response = local_lecturebot_execute_azure_blob_list_call($accountName, $accountKey, $containerName, $prefix);
    
    if ($response) {
        try {
            $xml = new SimpleXMLElement($response);
            if (isset($xml->Blobs->Blob)) {
                foreach ($xml->Blobs->Blob as $blob) {
                    $name = (string)$blob->Name;
                    // Check for key generated files
                    if (strpos($name, '/lecture_content.json') !== false ||
                        strpos($name, '/video_tutorial_') !== false) {
                        $hasContent = true;
                        break;
                    }
                }
            }
        } catch (Exception $e) {
            error_log("LectureBot XML Parse Error in check content: " . $e->getMessage());
        }
    }
    
    return $hasContent;
}

/**
 * Helper to query Azure Blob Storage for the highest regen_count
 * Matches folders like Tutorial_{courseid}_{sectionid}_{count}
 */
function local_lecturebot_get_azure_regen_count($courseid, $sectionid)
{
    $regenCount = 0;

    // Check credentials first
    if (defined('AZURE_STORAGE_ACCOUNT_NAME') && defined('AZURE_STORAGE_ACCOUNT_KEY')) {
        // Use global constant which now handles the dynamic naming
        $containerName = defined('AZURE_BLOB_CONTAINER_NAME') ? AZURE_BLOB_CONTAINER_NAME : 'lecturebot';
        
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
        $prefix = "Tutorial_{$courseid}_{$sectionid}_";

        $response = local_lecturebot_execute_azure_blob_list_call($accountName, $accountKey, $containerName, $prefix);

        $nextCount = 0;
        if ($response) {
            $nextCount = local_lecturebot_parse_azure_blob_list_response($response);
        }
        
        $latestIndex = $nextCount - 1;
        
        if ($latestIndex >= 0) {
            // Check if the latest folder has generated content
            $latestFolderPrefix = $prefix . $latestIndex . '/';
            $hasContent = local_lecturebot_check_folder_has_generated_content(
                $accountName,
                $accountKey,
                $containerName,
                $latestFolderPrefix
            );
            
            if ($hasContent) {
                // Latest folder is "used" (has generated content), so we must use a new one
                $regenCount = $latestIndex + 1;
            } else {
                // Latest folder is "draft" (no generated content), so we reuse it
                $regenCount = $latestIndex;
            }
        }
    } else {
         error_log("LectureBot: Azure credentials not defined, falling back to 0");
    }

    return $regenCount;
}


