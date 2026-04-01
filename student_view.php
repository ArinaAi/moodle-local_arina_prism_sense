<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
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

// PRISM Sense In-App Guided Tour (Student App)
\local_lecturebot\Utils::emitTourIfUnseen(
    $CFG,
    'lecturebot_tour_student_seen',
    ['#lecturebot-tour-student-header', '#lecturebot-tour-content-navigator'],
    'student'
);
echo $OUTPUT->footer();
?>

