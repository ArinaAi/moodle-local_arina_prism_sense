<?php
require_once('../../config.php');
require_once($CFG->libdir . '/adminlib.php');

// Ensure Utils is loaded
require_once(__DIR__ . '/classes/Utils.php');
require_once(__DIR__ . '/configurator_azure.php');

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid);

$PAGE->set_url(new moodle_url('/local/lecturebot/launch.php', ['courseid' => $courseid]));
$PAGE->set_pagelayout('popup'); // Use popup layout for full-screen app
$PAGE->set_title('Generate AI Lecture');
$PAGE->set_heading('Generate AI Lecture');

// Get course sections and context using Utils
// Note: Utils::prepareContext includes sections and sesskey
$context_json = \local_lecturebot\Utils::prepareContext($COURSE, $CFG->wwwroot);

// Get versioned JS URL
$builtjsurl = \local_lecturebot\Utils::getJsUrl($CFG->wwwroot, $CFG->dirroot . '/local/lecturebot', 'teacher.min.js');

echo $OUTPUT->header();
?>

<?php
// Render Teacher App
\local_lecturebot\Utils::renderReactApp(
    $context_json,
    $builtjsurl,
    'LectureBot.init',
    'lecturebot-react-root'
);

echo $OUTPUT->footer();
?>
