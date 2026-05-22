<?php

/**
 * Uninstall script for local_arina_prism_sense
 *
 * Removes all plugin-owned data that Moodle's core uninstall process
 * does not handle automatically:
 *  - Custom DB tables (dropped via xmldb_dropTable in upgrade.php helpers,
 *    but listed here for explicitness and as a safety net)
 *  - Per-user preferences set by this plugin
 *  - Files stored in the 'local_arina_prism_sense' file-storage component
 *
 * Note: Moodle's plugin uninstall process automatically drops all tables
 * declared in install.xml and purges the plugin's config records, so we
 * only need to handle data stored outside those mechanisms.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Custom uninstall steps for local_arina_prism_sense.
 *
 * @return bool True on success.
 */
function xmldb_local_arina_prism_sense_uninstall() // NOSONAR
{
    global $DB;

    // -------------------------------------------------------------------------
    // 1. Remove per-user preferences owned by this plugin.
    //    Moodle does not purge user_preferences automatically on uninstall.
    // -------------------------------------------------------------------------
    $userPreferenceNames = [
        'arina_prism_sense_wallet_sub_user_id',
        'arina_prism_sense_low_credits_state',
        'arina_prism_sense_tour_teacher_seen',
        'arina_prism_sense_tour_student_seen',
        'arina_prism_sense_tour_cms_seen',
        'arina_prism_sense_ripple_seen',
    ];

    foreach ($userPreferenceNames as $prefName) {
        $DB->delete_records('user_preferences', ['name' => $prefName]);
    }

    // -------------------------------------------------------------------------
    // 2. Delete all files stored under the local_arina_prism_sense component.
    //    Files are stored per-course-context, so we query all distinct context
    //    IDs that hold files for this component and delete them one by one.
    //    (file_storage has no single "delete by component" method.)
    // -------------------------------------------------------------------------
    $fs = get_file_storage();
    $contextids = $DB->get_fieldset_select(
        'files',
        'DISTINCT contextid',
        'component = ?',
        ['local_arina_prism_sense']
    );
    foreach ($contextids as $contextid) {
        $fs->delete_area_files($contextid, 'local_arina_prism_sense');
    }

    return true;
}
