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
 * Settings block for local_arina_prism_sense
 *
 * @package    local_arina_prism_sense
 * @copyright  2024 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig) {
    global $CFG;
    $companySettingsUrl = $CFG->wwwroot . '/local/arina_prism_sense/company_settings.php';

    // Create the settings page inside Site administration > Plugins > Local plugins > PRISM Sense
    $settings = new admin_settingpage(
        'local_arina_prism_sense',
        get_string('settings:pagetitle', 'local_arina_prism_sense')
    );

    // Global Org ID — used as fallback for non-IOMAD installs.
    // In IOMAD: paste the same org_id into mdl_company.code when creating a company.
    $settings->add(new admin_setting_configtext(
        'local_arina_prism_sense/org_id',
        get_string('settings:orgid', 'local_arina_prism_sense'),
        get_string('settings:orgid_desc', 'local_arina_prism_sense'),
        '',
        PARAM_TEXT
    ));

    // Global API Key — used as fallback for non-IOMAD installs.
    // IOMAD installations: use the Company Settings page below instead.
    $settings->add(new admin_setting_configtext(
        'local_arina_prism_sense/api_key',
        get_string('settings:apikey', 'local_arina_prism_sense'),
        get_string('settings:apikey_desc', 'local_arina_prism_sense', $companySettingsUrl),
        '',
        PARAM_TEXT
    ));

    // ── Registration Section ───────────────────────────────────────────────────
    // A dedicated page handles the 2-step auth service flow (register + generate-api-key).
    $registerUrl = $CFG->wwwroot . '/local/arina_prism_sense/register.php';

    $registerHtml = html_writer::tag('p', get_string('settings:register_desc', 'local_arina_prism_sense'));
    $registerHtml .= html_writer::tag(
        'a',
        '⚙ Register / Generate API Key on Arina.ai',
        ['href' => $registerUrl, 'class' => 'btn btn-primary btn-sm']
    );

    $settings->add(new admin_setting_heading(
        'local_arina_prism_sense/register_heading',
        get_string('settings:register_heading', 'local_arina_prism_sense'),
        $registerHtml
    ));

    // Link to per-company settings (only shown when IOMAD is installed).
    if (\core_plugin_manager::instance()->get_plugin_info('local_iomad') !== null) {
        $settings->add(new admin_setting_heading(
            'local_arina_prism_sense/iomad_heading',
            get_string('settings:iomad_heading', 'local_arina_prism_sense'),
            '<a href="' . $companySettingsUrl . '" class="btn btn-secondary btn-sm">' .
            get_string('settings:iomad_link', 'local_arina_prism_sense') . '</a>'
        ));
    }

    $ADMIN->add('localplugins', $settings);

    // Register the registration page so admin_externalpage_setup() resolves correctly.
    $ADMIN->add(
        'localplugins',
        new admin_externalpage(
            'local_arina_prism_sense_register',
            get_string('settings:register_heading', 'local_arina_prism_sense'),
            $CFG->wwwroot . '/local/arina_prism_sense/register.php',
            'moodle/site:config'
        )
    );
}
