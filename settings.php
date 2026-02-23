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
    // Create the settings page inside Site administration > Plugins > Local plugins > LectureBot
    $settings = new admin_settingpage('local_lecturebot', 'LectureBot Settings');

    // Add the API Key text field
    $settings->add(new admin_setting_configtext(
        'local_lecturebot/api_key',           // Setting name
        'Arina API Key',                      // Setting title
        'Enter the API key generated from the Arina website.
        This key will be sent via the X-API-key header for secure
        communication with backend microservices.', // Setting description
        '',                                   // Default value
        PARAM_TEXT                            // Input type
    ));

    $ADMIN->add('localplugins', $settings);
}
