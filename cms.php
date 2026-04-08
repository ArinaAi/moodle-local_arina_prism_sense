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
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

use local_arina_prism_sense\CompanyConfig;

require_once(__DIR__ . '/configurator_azure.php');

// Security: Require login and site admin permissions
require_login();
CompanyConfig::bootstrap($USER->id);
require_capability('moodle/site:config', context_system::instance());

// Page setup
$PAGE->set_context(context_system::instance());
$PAGE->set_pagelayout('embedded'); // Use embedded layout for clean, chrome-free experience
$PAGE->set_url(new moodle_url('/local/arina_prism_sense/cms.php'));
$PAGE->set_title(get_string('creditmanagement', 'local_arina_prism_sense'));
$PAGE->set_heading(get_string('creditmanagement', 'local_arina_prism_sense'));

echo $OUTPUT->header();

// Inject Moodle context for the React app
$moodlecontext = json_encode([
    'wwwroot' => $CFG->wwwroot,
    'sesskey' => sesskey(),
    'userid' => $USER->id,
    'tenantid' => CompanyConfig::getTenantId() ?? 1,
    'username' => fullname($USER),
    'useremail' => $USER->email,
]);

echo html_writer::tag('script', "window.MOODLE_CMS_CONTEXT = {$moodlecontext};", ['type' => 'text/javascript']);

// React root container
echo html_writer::div('', '', ['id' => 'arina_prism_sense-cms-root', 'style' => 'min-height: 100vh;']);

// React and ReactDOM must be globals BEFORE cms.min.js runs.
// webpack.config.js declares them as externals: { 'react': 'React', 'react-dom': 'ReactDOM' }
// Without these the bundle crashes silently and the page stays blank.
// Pinned to exact 18.2.0 (immutable npm tarball — safe without SRI).
// NOTE: $PAGE->requires->js() is intentionally NOT used here. That system defers
// script injection to Moodle's footer JS queue, which is incompatible with the
// bundle's DOMContentLoaded self-init pattern and causes a race condition.
echo html_writer::tag('script', '', [
    'src' => 'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
    'crossorigin' => 'anonymous',
]);
echo html_writer::tag('script', '', [
    'src' => 'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
    'crossorigin' => 'anonymous',
]);

// Shared vendor chunk (MUI, Emotion, framer-motion) extracted by webpack splitChunks.
// Must load before the app bundle since the bundle imports from these modules.
$vendorbuildpath = $CFG->dirroot . '/local/arina_prism_sense/amd/build/vendor.min.js';
if (file_exists($vendorbuildpath)) {
    $vendorjsurl = $CFG->wwwroot . '/local/arina_prism_sense/amd/build/vendor.min.js?v=' .
        filemtime($vendorbuildpath);
    echo html_writer::tag('script', '', ['src' => $vendorjsurl]);
}

$cmsbuildpath = $CFG->dirroot . '/local/arina_prism_sense/amd/build/cms.min.js';
$cmsjsurl = $CFG->wwwroot . '/local/arina_prism_sense/amd/build/cms.min.js?v=' .
    filemtime($cmsbuildpath);
echo html_writer::tag('script', '', ['src' => $cmsjsurl]);

// PRISM Sense In-App Guided Tour (CMS Dashboard)
\local_arina_prism_sense\Utils::emitTourIfUnseen(
    $CFG,
    'arina_prism_sense_tour_cms_seen',
    ['#arina_prism_sense-tour-cms-header', '#arina_prism_sense-tour-cms-sidebar'],
    'cms'
);
echo $OUTPUT->footer();

