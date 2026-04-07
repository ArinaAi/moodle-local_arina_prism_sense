<?php
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

    // Global API Key — used as fallback for non-IOMAD installs.
    // IOMAD installations: use the Company Settings page below instead.
    $settings->add(new admin_setting_configtext(
        'local_arina_prism_sense/api_key',
        get_string('settings:apikey', 'local_arina_prism_sense'),
        get_string('settings:apikey_desc', 'local_arina_prism_sense', $companySettingsUrl),
        '',
        PARAM_TEXT
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
}
