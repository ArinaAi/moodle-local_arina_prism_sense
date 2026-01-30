<?php
/**
 * API endpoint to delete a source PDF
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/filelib.php');

header('Content-Type: application/json');

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['sourceid'])) {
        throw new moodle_exception('Missing source ID');
    }
    
    $sourceid = $input['sourceid'];
    $courseid = required_param('courseid', PARAM_INT);
    
    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);
    require_sesskey();

    
    // Get source record
    $source = $DB->get_record('local_lecturebot_sources', ['id' => $sourceid, 'courseid' => $courseid]);
    
    if (!$source) {
        throw new moodle_exception('Source not found');
    }
    
    // Delete document from Weaviate vector store
    require_once(__DIR__ . '/../config_api.php');
    $weaviateDeleteResult = null;
    
    try {
        $deleteUrl = LECTUREBOT_API_DELETE_DOCUMENT . '?' . http_build_query([
            'course_id' => $courseid,
            'chapter_id' => $source->sectionid,
            'document_name' => $source->filename
        ], '', '&');
        error_log('LectureBot delete URL: ' . $deleteUrl);
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $deleteUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 60,
            CURLOPT_HTTPGET => true,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            debugging('Weaviate delete API curl error: ' . $curlError, DEBUG_DEVELOPER);
        } elseif ($httpCode !== 200) {
            debugging('Weaviate delete API returned HTTP ' . $httpCode . ': ' . $response, DEBUG_DEVELOPER);
        } else {
            $weaviateDeleteResult = json_decode($response, true);
            debugging('Weaviate delete successful: ' . $response, DEBUG_DEVELOPER);
        }
    } catch (Exception $weaviateEx) {
        // Log but don't block local deletion
        debugging('Weaviate delete API exception: ' . $weaviateEx->getMessage(), DEBUG_DEVELOPER);
    }
    
    // Delete file from Moodle file storage
    $fs = get_file_storage();
    $files = $fs->get_area_files(
        $context->id,
        'local_lecturebot',
        'sources',
        $source->fileitemid,
        'id',
        false
    );
    
    foreach ($files as $file) {
        $file->delete();
    }
    
    // Delete database record
    $DB->delete_records('local_lecturebot_sources', ['id' => $sourceid]);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Source deleted successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
