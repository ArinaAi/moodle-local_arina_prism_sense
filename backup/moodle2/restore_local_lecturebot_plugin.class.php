<?php
/**
 * Restore plugin class for local_lecturebot
 *
 * Hooks into Moodle's course-level restore and re-creates all plugin data
 * that was exported by backup_local_lecturebot_plugin:
 *
 *  - local_lecturebot_sources   (uploaded PDFs per section)
 *  - local_lecturebot_content   (generated content records)
 *  - local_lecturebot_tracking  (student completion tracking)
 *  - local_lecturebot_feedback  (structured feedback records)
 *
 * ID-mapping is handled by Moodle's restore engine — all annotated foreign
 * keys (courseid, sectionid, userid, etc.) are automatically remapped to the
 * new IDs in the target system.
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Defines the restore plugin structure for local_lecturebot.
 */
class restore_local_lecturebot_plugin extends restore_local_plugin // NOSONAR
{

    /**
     * Define the elements to be restored from the backup XML and where they
     * map to in the database.
     *
     * @return array Array of restore_path_element objects.
     */
    protected function define_course_plugin_structure()
    {

        $paths = [];

        // ── sources ───────────────────────────────────────────────────────────
        $paths[] = new restore_path_element(
            'lecturebot_source',
            '/course/plugin_local_lecturebot_course/lecturebot_sources/lecturebot_source'
        );

        // ── content ───────────────────────────────────────────────────────────
        $paths[] = new restore_path_element(
            'lecturebot_content',
            '/course/plugin_local_lecturebot_course/lecturebot_contents/lecturebot_content'
        );

        // ── tracking ──────────────────────────────────────────────────────────
        $paths[] = new restore_path_element(
            'lecturebot_tracking',
            '/course/plugin_local_lecturebot_course/lecturebot_trackings/lecturebot_tracking'
        );

        // ── feedback ──────────────────────────────────────────────────────────
        $paths[] = new restore_path_element(
            'lecturebot_feedback',
            '/course/plugin_local_lecturebot_course/lecturebot_feedbacks/lecturebot_feedback'
        );

        return $paths;
    }

    // =========================================================================
    // Process callbacks — called once per XML element during restore
    // =========================================================================

    /**
     * Restore a single local_lecturebot_sources record.
     *
     * @param array $data Parsed element data from the backup XML.
     */
    public function process_lecturebot_source($data)
    {
        global $DB;

        $data = (object) $data;
        $oldid = $data->id;

        // Remap foreign keys to IDs in the target Moodle instance.
        $data->courseid  = $this->get_mappingid('course', $data->courseid);
        $data->sectionid = $this->get_mappingid('course_section', $data->sectionid);

        // Remove the old primary key — DB will auto-generate a new one.
        unset($data->id);

        $newid = $DB->insert_record('local_lecturebot_sources', $data);

        // Store the old→new mapping so linked records (tracking, feedback) can
        // resolve contentid references later during the same restore pass.
        $this->set_mapping('lecturebot_source', $oldid, $newid, true);
        // 'true' above tells the restore engine to also restore associated files.
    }

    /**
     * Restore a single local_lecturebot_content record.
     *
     * @param array $data Parsed element data from the backup XML.
     */
    public function process_lecturebot_content($data)
    {
        global $DB;

        $data = (object) $data;
        $oldid = $data->id;

        // Remap course and section IDs.
        $data->courseid  = $this->get_mappingid('course', $data->courseid);
        $data->sectionid = $this->get_mappingid('course_section', $data->sectionid);

        // Remap user IDs — use 0 / null if the user no longer exists.
        $data->createdby   = $this->get_mappingid('user', $data->createdby) ?: null;
        $data->approvedby  = $this->get_mappingid('user', $data->approvedby) ?: null;
        $data->publishedby = $this->get_mappingid('user', $data->publishedby) ?: null;

        // parent_content_id and feedback_id reference other plugin records;
        // they will be resolved in a second pass after all content is inserted,
        // but we nullify them here to avoid constraint violations on first insert.
        $oldParentId   = $data->parent_content_id;
        $oldFeedbackId = $data->feedback_id;
        $data->parent_content_id = null;
        $data->feedback_id       = null;

        unset($data->id);
        $newid = $DB->insert_record('local_lecturebot_content', $data);

        $this->set_mapping('lecturebot_content', $oldid, $newid);

        // Defer self-referential mapping updates until after_restore_course().
        // Store the old-ID hints on the object for logging (not persisted here).
        unset($oldParentId, $oldFeedbackId);
    }

    /**
     * Restore a single local_lecturebot_tracking record.
     *
     * @param array $data Parsed element data from the backup XML.
     */
    public function process_lecturebot_tracking($data)
    {
        global $DB;

        $data = (object) $data;

        $data->courseid  = $this->get_mappingid('course', $data->courseid);
        $data->userid    = $this->get_mappingid('user', $data->userid);
        $data->contentid = $this->get_mappingid('lecturebot_content', $data->contentid);

        // Skip orphaned tracking rows (content was not restored).
        if (!$data->contentid) {
            return;
        }

        unset($data->id);
        $DB->insert_record('local_lecturebot_tracking', $data);
    }

    /**
     * Restore a single local_lecturebot_feedback record.
     *
     * @param array $data Parsed element data from the backup XML.
     */
    public function process_lecturebot_feedback($data)
    {
        global $DB;

        $data = (object) $data;
        $oldid = $data->id;

        $data->courseid   = $this->get_mappingid('course', $data->courseid);
        $data->userid     = $this->get_mappingid('user', $data->userid);
        $data->contentid  = $this->get_mappingid('lecturebot_content', $data->contentid);

        // Skip orphaned feedback rows.
        if (!$data->contentid) {
            return;
        }

        unset($data->id);
        $newid = $DB->insert_record('local_lecturebot_feedback', $data);

        $this->set_mapping('lecturebot_feedback', $oldid, $newid);
    }

    /**
     * Post-restore hook: fix up self-referential foreign keys in
     * local_lecturebot_content that could not be resolved during the first pass.
     *
     * parent_content_id and feedback_id both reference rows in the same table /
     * the feedback table, so they can only be resolved after all rows are inserted.
     */
    public function after_restore_course()
    {
        global $DB;

        $courseid = $this->get_courseid();

        $contents = $DB->get_records('local_lecturebot_content', ['courseid' => $courseid]);
        foreach ($contents as $row) {
            $needsUpdate = false;
            $update = new stdClass();
            $update->id = $row->id;

            if (!empty($row->parent_content_id)) {
                $newParent = $this->get_mappingid('lecturebot_content', $row->parent_content_id);
                if ($newParent) {
                    $update->parent_content_id = $newParent;
                    $needsUpdate = true;
                }
            }

            if (!empty($row->feedback_id)) {
                $newFeedback = $this->get_mappingid('lecturebot_feedback', $row->feedback_id);
                if ($newFeedback) {
                    $update->feedback_id = $newFeedback;
                    $needsUpdate = true;
                }
            }

            if ($needsUpdate) {
                $DB->update_record('local_lecturebot_content', $update);
            }
        }
    }
}
