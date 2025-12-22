<?php
/**
 * Get slide images from PPTX file
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Disable HTML error output to prevent breaking JSON response
define('NO_DEBUG_DISPLAY', true);
define('AJAX_SCRIPT', true);
define('REDIRECT_STDERR', ' 2>&1');

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_azure.php');
require_once(__DIR__ . '/../lib_azure_storage.php');

// Suppress all output before JSON
ob_start();

$contentid = required_param('contentid', PARAM_INT);
require_login();

// Clear any output that may have occurred
ob_clean();

header('Content-Type: application/json');

try {
    // Get the content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has access to this course
    $context = context_course::instance($content->courseid);
    require_capability('moodle/course:view', $context);
    
    // Release session lock to prevent blocking during long image extraction/upload
    \core\session\manager::write_close();

    // Get the PPTX file path from generation data
    $generationData = json_decode($content->generationdata, true);
    if (!isset($generationData['pptx_path']) || !file_exists($generationData['pptx_path'])) {
        echo json_encode([
            'status' => 'error',
            'error' => 'PPTX file not found',
            'images' => []
        ]);
        exit;
    }

    $filepath = $generationData['pptx_path'];
    
    // Extract images from PPTX with version tracking
    $images = extractImagesFromPptx($filepath, $content);
    
    echo json_encode([
        'status' => 'success',
        'images' => $images,
        'slideCount' => count($images)
    ]);

} catch (Exception $e) {
    error_log('LectureBot get_slide_images error: ' . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'images' => []
    ]);
}

/**
 * Extract images from PPTX file
 * @param string $pptxPath Path to the PPTX file
 * @param stdClass $content Content object from database
 * @return array Array of base64 encoded images or Azure URLs
 */
function extractImagesFromPptx($pptxPath, $content)
{
    global $CFG, $DB;
    // 1. Try PDF Preview Flow (Azure based)
    $images = getImagesFromPdfPreview($content, $pptxPath);
    if (!empty($images)) {
        return $images;
    }
    
    // 2. Fallback to Embedded Images
    return extractEmbeddedImagesFromPptx($pptxPath);
}

/**
 * Generate slide preview images from PDF in Azure Storage
 * @param int $courseid Course ID
 * @param string $outputDir Directory to save preview images
 */
function generateSlidePreviewsFromAzurePdf($courseid, $outputDir)
{
    global $CFG;
    
    // Create output directory if it doesn't exist
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0755, true);
    }
    
    // Download PDF from Azure Storage
    // Pattern: tutorial_{courseid}_slide.pdf
    $pdfBlobName = 'tutorial_' . $courseid . '_slide.pdf';
    
    error_log('LectureBot: Downloading PDF from Azure: ' . $pdfBlobName);
    
    try {
        $accountName = AZURE_STORAGE_ACCOUNT_NAME;
        $containerName = AZURE_BLOB_CONTAINER_NAME;
        $accountKey = AZURE_STORAGE_ACCOUNT_KEY;
        
        // Construct blob URL
        $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$pdfBlobName}";
        
        // Generate authorization
        $date = gmdate('D, d M Y H:i:s T');
        $version = '2020-04-08';
        
        $stringToSign = "GET\n\n\n\n\n\n\n\n\n\n\n\nx-ms-date:{$date}\n" .
            "x-ms-version:{$version}\n/{$accountName}/{$containerName}/{$pdfBlobName}";
        $signature = base64_encode(hash_hmac(
            'sha256',
            utf8_encode($stringToSign),
            base64_decode($accountKey),
            true
        ));
        
        // Download PDF
        $ch = curl_init($blobUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "x-ms-date: {$date}",
                "x-ms-version: {$version}",
                "Authorization: SharedKey {$accountName}:{$signature}"
            ],
            CURLOPT_TIMEOUT => 300,
        ]);
        
        $pdfContent = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200 || empty($pdfContent)) {
            error_log('LectureBot: Failed to download PDF from Azure. HTTP ' . $httpCode);
            return false;
        }
        
        error_log('LectureBot: Downloaded PDF from Azure (' . strlen($pdfContent) . ' bytes)');
        
        // Save PDF temporarily
        $tempPdfPath = $CFG->tempdir . '/lecturebot/temp_pdf_' . $courseid . '.pdf';
        file_put_contents($tempPdfPath, $pdfContent);
        
        // Convert PDF to PNG images using helper function
        $success = convertPdfToImages($tempPdfPath, $outputDir);
        
        if ($success) {
            error_log('LectureBot: Successfully converted PDF to PNG images');
        } else {
            error_log('LectureBot: Failed to convert PDF to PNG images');
        }
        
        // Clean up temporary PDF
        @unlink($tempPdfPath);
        
    } catch (Exception $e) {
        error_log('LectureBot: Error generating previews from Azure PDF: ' . $e->getMessage());
        return false;
    }
}


/**
 * Generate slide preview images from PPTX
 * @param string $pptxPath Path to the PPTX file
 * @param string $outputDir Directory to save preview images
 */
function generateSlidePreviews($pptxPath, $outputDir)
{
    global $CFG;
    
    // Create output directory if it doesn't exist
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0755, true);
    }
    
    // Try to find LibreOffice/soffice
    $soffice = getLibreOfficePath();
    
    if (!$soffice) {
        error_log('LectureBot: LibreOffice/soffice not found - cannot generate slide previews');
        return;
    }
    
    // Convert PPTX to PDF first, then PDF to images
    $tempPdfDir = $CFG->tempdir . '/lecturebot/temp_pdf';
    if (!is_dir($tempPdfDir)) {
        mkdir($tempPdfDir, 0755, true);
    }
    
    $pdfFile = convertPptxToPdf($soffice, $pptxPath, $tempPdfDir);
    
    if ($pdfFile) {
        error_log('LectureBot: Looking for PDF at: ' . $pdfFile);
        error_log('LectureBot: PDF exists: ' . (file_exists($pdfFile) ? 'YES' : 'NO'));
        
        if (file_exists($pdfFile)) {
            error_log('LectureBot: PDF file size: ' . filesize($pdfFile) . ' bytes');
            
            // Use helper function to convert PDF to images
            $success = convertPdfToImages($pdfFile, $outputDir);
            
            if ($success) {
                error_log('LectureBot: Successfully generated slide previews');
            } else {
                error_log('LectureBot: Failed to generate slide previews from simplified PDF');
            }
            
            // Clean up PDF
            @unlink($pdfFile);
        }
    }
}

/**
 * Helper function to find LibreOffice executable
 * @return string|false Path to soffice or false if not found
 */
function getLibreOfficePath()
{
    $possibleSofficePaths = [
        '/usr/local/bin/soffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        '/usr/bin/soffice',
        '/usr/bin/libreoffice',
        '/opt/libreoffice/program/soffice',
    ];
    
    foreach ($possibleSofficePaths as $path) {
        if (file_exists($path) && is_executable($path)) {
            return $path;
        }
    }
    
    return false;
}

/**
 * Helper function to convert PDF to PNG images using ImageMagick
 * @param string $pdfPath Path to the source PDF file
 * @param string $outputDir Directory to save generated images
 * @return bool True on success, false on failure
 */
function convertPdfToImages($pdfPath, $outputDir)
{
    $convert = '';
    $possibleConvertPaths = [
        '/usr/local/bin/convert',
        '/usr/bin/convert',
        '/opt/local/bin/convert',
    ];
    
    foreach ($possibleConvertPaths as $path) {
        if (file_exists($path) && is_executable($path)) {
            $convert = $path;
            break;
        }
    }
    
    if (!empty($convert) && file_exists($convert)) {
        // Use 'magick' command for ImageMagick v7
        $magickCmd = str_replace('/convert', '/magick', $convert);
        if (!file_exists($magickCmd)) {
            $magickCmd = $convert;
        }
        
        $cmd = escapeshellcmd($magickCmd) . ' -density 150 ' . escapeshellarg($pdfPath) .
               ' -quality 85 ' . escapeshellarg($outputDir . '/slide_%03d.png') . REDIRECT_STDERR;
        
        error_log('LectureBot: ImageMagick command: ' . $cmd);
        exec($cmd, $output, $returnCode);
        
        error_log('LectureBot: ImageMagick return code: ' . $returnCode);
        
        if ($returnCode === 0) {
            return true;
        } else {
            error_log('LectureBot: ImageMagick conversion failed: ' . implode("\n", $output));
            return false;
        }
    } else {
        error_log('LectureBot: ImageMagick not found - cannot generate slide previews');
        return false;
    }
}

/**
 * Try to get images from PDF preview generated from Azure
 * @param stdClass $content Content record
 * @param string $pptxPath Path to PPTX file
 * @return array Array of image data or empty array
 */
function getImagesFromPdfPreview($content, $pptxPath)
{
    global $CFG;

    // Use contentid + creation time for cache folder
    $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 'default_tenant';
    $cacheKey = hash('sha256', $pptxPath);
    $azureFolderId = $tenantId . '/course_' . $content->courseid .
        '_section_' . $content->sectionid . '_' . $content->timecreated;

    // Local cache directory
    $previewDir = $CFG->tempdir . '/lecturebot/previews/' . $cacheKey;

    // Check if we already have cached PNGs locally
    $localCacheExists = is_dir($previewDir) && count(glob($previewDir . '/slide_*.png')) > 0;

    if (!$localCacheExists) {
        error_log('LectureBot: No local cache, generating slide previews from Azure PDF...');
        // Download PDF from Azure and convert to PNG
        generateSlidePreviewsFromAzurePdf($content->courseid, $previewDir);
    } else {
        error_log('LectureBot: Using cached slide previews from: ' . $previewDir);
    }

    // Check if we have generated preview images
    if (is_dir($previewDir)) {
        $previewFiles = glob($previewDir . '/slide_*.png');
        if (!empty($previewFiles)) {
             // Sort by filename to ensure correct order
             natsort($previewFiles);
             
             // Check if first slide exists in Azure (to avoid re-uploading)
             $accountName = AZURE_STORAGE_ACCOUNT_NAME;
             $containerName = AZURE_BLOB_CONTAINER_NAME;
             $firstSlideBlobName = 'slides/' . $azureFolderId . '/slide_000.png';
             $firstSlideUrl = get_azure_blob_url($accountName, $containerName, $firstSlideBlobName);
             
             $azureAlreadyHasSlides = check_azure_blob_exists($firstSlideUrl);
             
             if (!$azureAlreadyHasSlides) {
                 error_log('LectureBot: Slides not in Azure, uploading ' . count($previewFiles) . ' slides...');
                 upload_slides_to_azure($previewFiles, $azureFolderId);
             } else {
                 error_log('LectureBot: Slides already in Azure, skipping upload');
             }

             $images = [];
             $slideNumber = 1;
             foreach ($previewFiles as $previewFile) {
                 $filename = basename($previewFile);
                 $blobName = 'slides/' . $azureFolderId . '/' . $filename;
                 $azureUrl = get_azure_blob_url($accountName, $containerName, $blobName);
                 $images[] = [
                    'filename' => $filename,
                    'data' => $azureUrl,
                    'slideNumber' => $slideNumber++
                 ];
             }
             return $images;
        }
    }
    return [];
}

/**
 * Extract embedded images from PPTX file directly
 * @param string $pptxPath Path to PPTX file
 * @return array Array of extracted images
 */
function extractEmbeddedImagesFromPptx($pptxPath)
{
    $extractedImages = [];
    try {
        $zip = new ZipArchive();
        if ($zip->open($pptxPath) === true) {
             // Look for images in ppt/media/ directory
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $image = tryExtractImageFromZip($zip, $i);
                if ($image) {
                    $extractedImages[] = $image;
                }
            }
            $zip->close();
            
            if (!empty($extractedImages)) {
                // Sort by slide number
                usort($extractedImages, function ($a, $b) {
                    return $a['slideNumber'] - $b['slideNumber'];
                });
                return $extractedImages;
            }
        }
    } catch (Exception $e) {
        error_log('LectureBot: Error extracting images from PPTX: ' . $e->getMessage());
    }
    return $extractedImages;
}

/**
 * Helper function to convert PPTX to PDF using LibreOffice
 * @param string $soffice Path to soffice executable
 * @param string $pptxPath Path to PPTX file
 * @param string $outputDir Output directory for PDF
 * @return string|false Path to generated PDF or false on failure
 */
function convertPptxToPdf($soffice, $pptxPath, $outputDir)
{
    // Convert PPTX to PDF
    $cmd = escapeshellcmd($soffice) . ' --headless --convert-to pdf --outdir ' .
           escapeshellarg($outputDir) . ' ' . escapeshellarg($pptxPath) . REDIRECT_STDERR;
    
    exec($cmd, $output, $returnCode);
    
    error_log('LectureBot: LibreOffice command: ' . $cmd);
    error_log('LectureBot: LibreOffice return code: ' . $returnCode);
    error_log('LectureBot: LibreOffice output: ' . implode("\n", $output));
    
    if ($returnCode === 0) {
        // Find the generated PDF
        $pdfFile = $outputDir . '/' . pathinfo($pptxPath, PATHINFO_FILENAME) . '.pdf';
        if (file_exists($pdfFile)) {
            return $pdfFile;
        }
    } else {
        error_log('LectureBot: LibreOffice PDF conversion failed: ' . implode("\n", $output));
    }
    
    return false;
}

/**
 * Helper function to try extracting an image from zip at index/filename
 * @param ZipArchive $zip Zip archive instance
 * @param int $index Index of file in zip
 * @return array|null Image data array or null if not an image
 */
function tryExtractImageFromZip($zip, $index)
{
    $filename = $zip->getNameIndex($index);
    
    // Check if it's an image file in the media folder
    if (preg_match('/ppt\/media\/image(\d+)\.(png|jpg|jpeg|gif)/i', $filename, $matches)) {
        $imageData = $zip->getFromName($filename);
        if ($imageData !== false) {
            $extension = strtolower($matches[2]);
            $mimeType = 'image/' . ($extension === 'jpg' ? 'jpeg' : $extension);
            
            return [
                'filename' => basename($filename),
                'data' => 'data:' . $mimeType . ';base64,' . base64_encode($imageData),
                'slideNumber' => (int)$matches[1]
            ];
        }
    }
    
    return null;
}
