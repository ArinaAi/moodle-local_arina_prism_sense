<?php
define('CLI_SCRIPT', true);
require(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_azure.php');

// Test parameters (Based on user logs: Course 6, Section 74, Regen 6)
$courseid = 6;
$sectionid = 74;
$regenCount = 6; // Use the count where we know files exist (or failed to be found)

// Construct Path for Slides
// Note: User was looking for video, but we can test auth with slides path if video doesn't exist
// Logic from generate_content_task.php (Video Case):
$tenantId = 1; // Default
$containerName = strtolower('Blob-Tutorial-Gen-' . $tenantId);
$blobName = "Tutorial_{$courseid}_{$sectionid}_{$regenCount}/video_tutorial_{$courseid}_{$sectionid}.mp4";
$outputPath = sys_get_temp_dir() . '/test_download.mp4';

mtrace("---- Testing Azure Download ----");
mtrace("Account: " . AZURE_STORAGE_ACCOUNT_NAME);
mtrace("Container: " . $containerName);
mtrace("Blob: " . $blobName);

try {
    downloadFileFromAzure($blobName, $outputPath, $containerName);
    mtrace("SUCCESS: File downloaded to $outputPath");
    mtrace("File size: " . filesize($outputPath) . " bytes");
} catch (Exception $e) {
    mtrace("ERROR: " . $e->getMessage());
}

function downloadFileFromAzure($blobName, $outputPath, $containerName) {
    $accountName = AZURE_STORAGE_ACCOUNT_NAME;
    $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
    
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
                   "/{$accountName}/{$containerName}/{$blobName}";
    
    $signature = base64_encode(hash_hmac(
        'sha256',
        mb_convert_encoding($stringToSign, "UTF-8"),
        base64_decode(AZURE_STORAGE_ACCOUNT_KEY),
        true
    ));
    $authHeader = "SharedKey {$accountName}:{$signature}";
    
    $fp = fopen($outputPath, 'w+');
    if (!$fp) {
        throw new Exception("Could not open output path: $outputPath");
    }

    $ch = curl_init($blobUrl);
    curl_setopt_array($ch, [
        CURLOPT_FILE => $fp,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            "x-ms-date: {$date}",
            "x-ms-version: {$version}",
            "Authorization: {$authHeader}"
        ],
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception(curl_error($ch));
    }
    
    curl_close($ch);
    fclose($fp);
    
    if ($httpCode !== 200) {
        throw new Exception("Azure returned HTTP $httpCode");
    }
}
