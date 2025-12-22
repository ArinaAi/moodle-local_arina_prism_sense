<?php
/**
 * Convert PPTX to PDF and stream it
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');

$contentid = required_param('contentid', PARAM_INT);
require_login();

define('HTTP_500_ERROR', 'HTTP/1.0 500 Internal Server Error');

try {
    // Get the content record
    $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

    // Verify user has access to this course
    $context = context_course::instance($content->courseid);
    require_capability('moodle/course:view', $context);

    // Get the PPTX file path
    $generationData = json_decode($content->generationdata, true);
    if (!isset($generationData['pptx_path']) || !file_exists($generationData['pptx_path'])) {
        header('HTTP/1.0 404 Not Found');
        die('PPTX file not found');
    }

    $pptxPath = $generationData['pptx_path'];
    $pdfPath = str_replace('.pptx', '.pdf', $pptxPath);
    
    // Check if PDF already exists
    if (!file_exists($pdfPath)) {
        // Try to find LibreOffice/soffice
        $soffice = '';
        
        // Common paths for LibreOffice on different systems
        $possiblePaths = [
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',  // macOS Homebrew
            '/usr/local/bin/soffice',
            '/usr/bin/soffice',
            '/usr/bin/libreoffice',
            '/opt/libreoffice/program/soffice',
        ];
        
        foreach ($possiblePaths as $path) {
            if (file_exists($path) && is_executable($path)) {
                $soffice = $path;
                break;
            }
        }
        
        // If not found in common paths, try using which command
        if (empty($soffice)) {
            $whichResult = shell_exec('which soffice 2>/dev/null');
            if ($whichResult !== null && !empty(trim($whichResult))) {
                $soffice = trim($whichResult);
            }
        }
        
        if (empty($soffice)) {
            $whichResult = shell_exec('which libreoffice 2>/dev/null');
            if ($whichResult !== null && !empty(trim($whichResult))) {
                $soffice = trim($whichResult);
            }
        }
        
        if (!empty($soffice) && file_exists($soffice)) {
            $outputDir = dirname($pptxPath);
            $cmd = escapeshellcmd($soffice) . ' --headless --convert-to pdf --outdir ' .
                   escapeshellarg($outputDir) . ' ' . escapeshellarg($pptxPath) . ' 2>&1';
            exec($cmd, $output, $returnCode);
            
            if ($returnCode !== 0 || !file_exists($pdfPath)) {
                header(HTTP_500_ERROR);
                die('PDF conversion failed. LibreOffice may not be installed.');
            }
        } else {
            header(HTTP_500_ERROR);
            die('LibreOffice not found. Cannot convert PPTX to PDF.');
        }
    }
    
    // Stream the PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="slides.pdf"');
    header('Content-Length: ' . filesize($pdfPath));
    readfile($pdfPath);
    exit;

} catch (Exception $e) {
    header(HTTP_500_ERROR);
    die('Error: ' . $e->getMessage());
}
