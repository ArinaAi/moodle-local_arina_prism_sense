<?php

/**
 * Uninstall script for local_lecturebot
 *
 * Removes all plugin-owned data that Moodle's core uninstall process
 * does not handle automatically:
 *  - Custom DB tables (dropped via xmldb_dropTable in upgrade.php helpers,
 *    but listed here for explicitness and as a safety net)
 *  - Per-user preferences set by this plugin
 *  - Files stored in the 'local_lecturebot' file-storage component
 *
 * Note: Moodle's plugin uninstall process automatically drops all tables
 * declared in install.xml and purges the plugin's config records, so we
 * only need to handle data stored outside those mechanisms.
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Custom uninstall steps for local_lecturebot.
 *
 * @return bool True on success.
 */
function xmldb_local_lecturebot_uninstall() // NOSONAR
{
    global $DB;

    // -------------------------------------------------------------------------
    // 1. Remove per-user preferences owned by this plugin.
    //    Moodle does not purge user_preferences automatically on uninstall.
    // -------------------------------------------------------------------------
    $userPreferenceNames = [
        'lecturebot_wallet_sub_user_id',
        'lecturebot_low_credits_state',
    ];

    foreach ($userPreferenceNames as $prefName) {
        $DB->delete_records('user_preferences', ['name' => $prefName]);
    }

    // -------------------------------------------------------------------------
    // 2. Delete all files stored under the local_lecturebot component.
    //    This covers uploaded source PDFs (filearea = 'sources') and any other
    //    files this plugin may have written to Moodle's file storage.
    // -------------------------------------------------------------------------
    $fs = get_file_storage();
    $fs->delete_area_files_by_component('local_lecturebot');

    return true;
}
