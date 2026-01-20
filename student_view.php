<?php
require_once('../../config.php');

// Ensure Utils is loaded
require_once(__DIR__ . '/classes/Utils.php');

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid);

$PAGE->set_url(new moodle_url('/local/lecturebot/student_view.php', ['courseid' => $courseid]));
$PAGE->set_pagelayout('popup');
$PAGE->set_title('Course Materials');
$PAGE->set_heading('Course Materials');

$context_json = \local_lecturebot\Utils::prepareContext($COURSE, $CFG->wwwroot);

// Request student bundle
$builtjsurl = \local_lecturebot\Utils::getJsUrl($CFG->wwwroot, $CFG->dirroot . '/local/lecturebot', 'student.min.js');

echo $OUTPUT->header();
?>

<?php
// Render Student App
\local_lecturebot\Utils::renderReactApp(
    $context_json,
    $builtjsurl,
    'LectureBot.initStudent',
    'lecturebot-student-root'
);

echo $OUTPUT->footer();
?>
