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

/**
 * Credit Management System - Admin Dashboard
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

// Security: Require login and site admin permissions
require_login();
require_capability('moodle/site:config', context_system::instance());

// Page setup
$PAGE->set_context(context_system::instance());
$PAGE->set_pagelayout('embedded'); // Use embedded layout for clean, chrome-free experience
$PAGE->set_url(new moodle_url('/local/lecturebot/cms.php'));
$PAGE->set_title(get_string('creditmanagement', 'local_lecturebot'));
$PAGE->set_heading(get_string('creditmanagement', 'local_lecturebot'));

// Include the compiled CMS React bundle
$PAGE->requires->js('/local/lecturebot/amd/build/cms.min.js', true);

echo $OUTPUT->header();

// Inject Moodle context for the React app
$moodlecontext = json_encode([
    'wwwroot' => $CFG->wwwroot,
    'sesskey' => sesskey(),
    'userid' => $USER->id,
    'tenantid' => 1, // Implement proper tenant resolution
    'username' => fullname($USER),
    'useremail' => $USER->email,
]);

echo html_writer::tag('script', "window.MOODLE_CMS_CONTEXT = {$moodlecontext};", ['type' => 'text/javascript']);

// React root container
echo html_writer::div('', '', ['id' => 'lecturebot-cms-root', 'style' => 'min-height: 100vh;']);

echo $OUTPUT->footer();
