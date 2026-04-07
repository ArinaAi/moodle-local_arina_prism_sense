<?php
/**
 * API endpoint to delete a source PDF
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once($CFG->libdir . '/filelib.php');
require_once(__DIR__ . '/../config_api.php');
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
    CompanyConfig::bootstrap($USER->id);
    $context = context_course::instance($courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);
    require_sesskey();


    // Get source record
    $source = $DB->get_record('local_arina_prism_sense_sources', ['id' => $sourceid, 'courseid' => $courseid]);

    if (!$source) {
        throw new moodle_exception('Source not found');
    }

    // Delete document from the batch upload service.
    // Called for both 'uploaded' and 'failed' sources — the backend handles
    // both cases correctly via the same DELETE endpoint.
    // URL: DELETE {BOT_BASE_URL}/batches/{batch_id}/uploads/{upload_id}
    if (!empty($source->batch_id) && !empty($source->upload_id)) {
        try {
            $deleteUploadUrl = API_BATCH_UPLOADS_BASE
                . '/' . urlencode($source->batch_id)
                . '/uploads/' . urlencode($source->upload_id);
            error_log('LectureBot delete_source: calling DELETE ' . $deleteUploadUrl);

            // Get API Key from settings.
            $apiKey = CompanyConfig::getApiKey();

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => $deleteUploadUrl,
                CURLOPT_CUSTOMREQUEST  => 'DELETE',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTPHEADER     => ['X-Api-Key: ' . $apiKey],
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                // Log but don't block local deletion.
                error_log('LectureBot delete_source: batch DELETE curl error: ' . $curlError);
            } elseif ($httpCode !== 200 && $httpCode !== 204) {
                error_log('LectureBot delete_source: batch DELETE returned HTTP ' . $httpCode . ': ' . $response);
            } else {
                error_log('LectureBot delete_source: backend delete successful for upload ' . $source->upload_id);
            }
        } catch (Exception $deleteEx) {
            // Log but don't block local deletion.
            error_log('LectureBot delete_source: backend DELETE exception: ' . $deleteEx->getMessage());
        }
    } else {
        // No backend reference stored (e.g. backend upload was disabled or an old record).
        // Nothing to delete on the backend side.
        error_log('LectureBot delete_source: no batch_id/upload_id for source ' .
        $sourceid . ', skipping backend call');
    }


    // Delete file from Moodle file storage
    $fs = get_file_storage();
    $files = $fs->get_area_files(
        $context->id,
        'local_arina_prism_sense',
        'sources',
        $source->fileitemid,
        'id',
        false
    );

    foreach ($files as $file) {
        $file->delete();
    }

    // Delete database record
    $DB->delete_records('local_arina_prism_sense_sources', ['id' => $sourceid]);

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
