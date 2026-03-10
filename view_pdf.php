<?php
/**
 * Secure PDF viewer endpoint
 * Serves PDF files with permission checks
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

// Get parameters
$sourceid = required_param('id', PARAM_INT);

try {
    global $DB, $USER;

    // Get source record
    $source = $DB->get_record('local_lecturebot_sources', ['id' => $sourceid], '*', MUST_EXIST);

    // Require login and check course access
    require_login($source->courseid);

    // Check if user has capability to view/generate content here (teachers/admins)
    $context = context_course::instance($source->courseid);
    require_capability('local/lecturebot:generatecontent', $context);

    // Get the file from Moodle file storage
    $fs = get_file_storage();

    // Get context for the file
    $filecontext = context_course::instance($source->courseid);

    // Retrieve file from Moodle's file API
    $files = $fs->get_area_files(
        $filecontext->id,
        'local_lecturebot',
        'sources',
        $source->fileitemid,
        'itemid, filepath, filename',
        false
    );

    if (empty($files)) {
        throw new moodle_exception('filenotfound', 'error', '', null, 'PDF file not found in storage');
    }

    // Get the first (and should be only) file
    $file = reset($files);

    // Verify it's a PDF
    if ($file->get_mimetype() !== 'application/pdf') {
        throw new moodle_exception('invalidfiletype', 'error', '', null, 'File is not a valid PDF');
    }

    // Serve the file inline (for preview in browser)
    send_stored_file($file, 0, 0, false, array('filename' => $source->filename));

} catch (Exception $e) {
    // Log error
    debugging('Error viewing PDF: ' . $e->getMessage(), DEBUG_DEVELOPER);

    // Show error page
    print_error('errorviewingpdf', 'local_lecturebot', '', null, $e->getMessage());
}
