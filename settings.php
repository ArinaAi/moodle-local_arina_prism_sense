<?php
/**
 * Settings block for local_lecturebot
 *
 * @package    local_lecturebot
 * @copyright  2024
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig) {
    global $CFG;
    $companySettingsUrl = $CFG->wwwroot . '/local/lecturebot/company_settings.php';

    // Create the settings page inside Site administration > Plugins > Local plugins > PRISM Sense
    $settings = new admin_settingpage('local_lecturebot', 'PRISM Sense Settings');

    // Global API Key — used as fallback for non-IOMAD installs.
    // IOMAD installations: use the Company Settings page below instead.
    $settings->add(new admin_setting_configtext(
        'local_lecturebot/api_key',           // Setting name
        'Arina API Key (Global / Fallback)',  // Setting title
        'Global API key. Used on standalone Moodle installs (without IOMAD). ' .
        'For IOMAD multi-tenant setups, configure per-company API keys via the ' .
        '<a href="' . $companySettingsUrl . '">Company Settings</a> page instead.',
        '',                                   // Default value
        PARAM_TEXT                            // Input type
    ));

    // Link to per-company settings (only shown when IOMAD is installed).
    if (\core_plugin_manager::instance()->get_plugin_info('local_iomad') !== null) {
        $settings->add(new admin_setting_heading(
            'local_lecturebot/iomad_heading',
            'IOMAD Multi-Tenant Configuration',
            '<a href="' . $companySettingsUrl . '" class="btn btn-secondary btn-sm">' .
            '⚙ Configure Per-Company API Keys</a>'
        ));
    }

    $ADMIN->add('localplugins', $settings);
}
