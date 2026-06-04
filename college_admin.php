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
 * College Admin Dashboard — Curriculum Management
 *
 * Provides IOMAD Company Managers with a UI to manage the academic
 * structure (Degrees → Semesters → Subjects) and assign Cohorts (Batches).
 *
 * Access: IOMAD Company Managers and Site Admins only.
 * If IOMAD is not installed the page throws a capability exception.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

use local_arina_prism_sense\CompanyConfig;

// Security: Require login; allow Site Admins and IOMAD Company Managers.
// requireCmsAccess() also calls bootstrap() internally so all getters are ready.
require_login();
CompanyConfig::requireCmsAccess();

// Additionally guard: this page only makes sense on IOMAD installations.
if (!CompanyConfig::isIomadInstalled()) {
    throw new \required_capability_exception(
        \context_system::instance(),
        'moodle/site:config',
        'nopermissions',
        ''
    );
}

// Page setup
$PAGE->set_context(context_system::instance());
$PAGE->set_pagelayout('embedded'); // Chrome-free, same as cms.php
$PAGE->set_url(new moodle_url('/local/arina_prism_sense/college_admin.php'));
$PAGE->set_title(get_string('collegeadmin_title', 'local_arina_prism_sense'));
$PAGE->set_heading(get_string('collegeadmin_title', 'local_arina_prism_sense'));

echo $OUTPUT->header();

// Resolve company root category ID.
// IOMAD stores a category per company in the company table (name varies by IOMAD version).
$companyId   = CompanyConfig::getCompanyId();
$companyCatId = null;
if ($companyId) {
    $tComp = CompanyConfig::getIomadTable('company');
    $companyCatId = $DB->get_field($tComp, 'category', ['id' => $companyId]);
}

// Inject Moodle context for the React app.
$moodlecontext = json_encode([
    'wwwroot'          => $CFG->wwwroot,
    'sesskey'          => sesskey(),
    'userid'           => $USER->id,
    'username'         => fullname($USER),
    'isCompanyManager' => !is_siteadmin() && $companyId !== null,
    'companyId'        => $companyId,
    'companyCatId'     => $companyCatId ? (int) $companyCatId : null,
]);

echo html_writer::tag(
    'script',
    "window.MOODLE_COLLEGE_ADMIN_CONTEXT = {$moodlecontext};",
    ['type' => 'text/javascript']
);

// React root container.
echo html_writer::div('', '', ['id' => 'arina-college-admin-root', 'style' => 'min-height: 100vh;']);

// React 18 globals — must load BEFORE the bundle (same pattern as cms.php).
echo html_writer::tag('script', '', [
    'src'         => 'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
    'crossorigin' => 'anonymous',
]);
echo html_writer::tag('script', '', [
    'src'         => 'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
    'crossorigin' => 'anonymous',
]);

// Shared vendor chunk (MUI, Emotion, framer-motion).
$vendorbuildpath = $CFG->dirroot . '/local/arina_prism_sense/build/vendor.min.js';
if (file_exists($vendorbuildpath)) {
    $vendorjsurl = $CFG->wwwroot . '/local/arina_prism_sense/build/vendor.min.js?v=' .
        filemtime($vendorbuildpath);
    echo html_writer::tag('script', '', ['src' => $vendorjsurl]);
}

// College Admin bundle.
$buildpath = $CFG->dirroot . '/local/arina_prism_sense/build/college_admin.min.js';
if (file_exists($buildpath)) {
    $jsurl = $CFG->wwwroot . '/local/arina_prism_sense/build/college_admin.min.js?v=' .
        filemtime($buildpath);
    echo html_writer::tag('script', '', ['src' => $jsurl]);
} else {
    // Build not compiled yet — show a clear developer message.
    echo html_writer::tag(
        'div',
        'College Admin bundle not compiled. Run <code>npm run build</code> inside the plugin directory.',
        ['style' => 'padding:40px;font-family:monospace;color:#e83e8c;font-size:14px;']
    );
}

echo $OUTPUT->footer();
