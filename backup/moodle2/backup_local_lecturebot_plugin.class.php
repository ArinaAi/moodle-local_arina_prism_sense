<?php
/**
 * Backup plugin class for local_lecturebot
 *
 * Hooks into Moodle's course-level backup and exports all plugin data
 * that is associated with the course being backed up:
 *
 *  - local_lecturebot_sources   (uploaded PDFs per section)
 *  - local_lecturebot_content   (generated content records)
 *  - local_lecturebot_tracking  (student completion tracking)
 *  - local_lecturebot_feedback  (structured feedback records)
 *
 * Note: local_lecturebot_company_config is company-level IOMAD config and
 * is intentionally excluded — it is not course-specific.
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Defines the backup plugin structure for local_lecturebot.
 *
 * Moodle calls define_course_plugin_structure() automatically when performing
 * a full course backup, provided this class lives at:
 *   backup/moodle2/backup_local_lecturebot_plugin.class.php
 */
class backup_local_lecturebot_plugin extends backup_local_plugin // NOSONAR
{

    /**
     * Define the complete local_lecturebot structure to be attached to the
     * 'course' XML element during backup.
     *
     * @return backup_plugin_element
     */
    protected function define_course_plugin_structure()
    {

        // Root element for this plugin under the <course> node.
        $plugin = $this->get_plugin_element(null, null, null);

        // ── sources ───────────────────────────────────────────────────────────
        $sources = new backup_nested_element(
            'lecturebot_sources',
            null,
            null
        );

        $source = new backup_nested_element(
            'lecturebot_source',
            ['id'],
            [
                'courseid',
                'sectionid',
                'filename',
                'fileitemid',
                'filesize',
                'title',
                'author',
                'is_scanned',
                'batch_id',
                'upload_id',
                'processing_status',
                'timecreated',
                'timemodified',
            ]
        );

        // ── content ───────────────────────────────────────────────────────────
        $contents = new backup_nested_element(
            'lecturebot_contents',
            null,
            null
        );

        $content = new backup_nested_element(
            'lecturebot_content',
            ['id'],
            [
                'courseid',
                'sectionid',
                'contenttype',
                'status',
                'title',
                'generationdata',
                'errormessage',
                'timecreated',
                'timemodified',
                'timepublished',
                'approved',
                'approvedby',
                'timeapproved',
                'request_id',
                'createdby',
                'publishedby',
                'parent_content_id',
                'feedback_id',
                'regen_count',
            ]
        );

        // ── tracking ──────────────────────────────────────────────────────────
        $trackings = new backup_nested_element(
            'lecturebot_trackings',
            null,
            null
        );

        $tracking = new backup_nested_element(
            'lecturebot_tracking',
            ['id'],
            [
                'userid',
                'contentid',
                'courseid',
                'status',
                'timecreated',
                'timemodified',
            ]
        );

        // ── feedback ──────────────────────────────────────────────────────────
        $feedbacks = new backup_nested_element(
            'lecturebot_feedbacks',
            null,
            null
        );

        $feedback = new backup_nested_element(
            'lecturebot_feedback',
            ['id'],
            [
                'contentid',
                'courseid',
                'userid',
                'feedback_type',
                'selected_categories',
                'topics_needing_depth',
                'topics_overexplained',
                'extra_topics',
                'missing_subtopics',
                'reordered_flow',
                'rating',
                'comments',
                'timecreated',
            ]
        );

        // ── Build element tree ────────────────────────────────────────────────
        $plugin->add_child($sources);
        $sources->add_child($source);

        $plugin->add_child($contents);
        $contents->add_child($content);

        $plugin->add_child($trackings);
        $trackings->add_child($tracking);

        $plugin->add_child($feedbacks);
        $feedbacks->add_child($feedback);

        // ── Define data sources (SQL queries) ─────────────────────────────────
        $source->set_source_table(
            'local_lecturebot_sources',
            ['courseid' => backup::VAR_COURSEID]
        );

        $content->set_source_table(
            'local_lecturebot_content',
            ['courseid' => backup::VAR_COURSEID]
        );

        $tracking->set_source_table(
            'local_lecturebot_tracking',
            ['courseid' => backup::VAR_COURSEID]
        );

        $feedback->set_source_table(
            'local_lecturebot_feedback',
            ['courseid' => backup::VAR_COURSEID]
        );

        // ── Annotate IDs for cross-reference mapping during restore ───────────
        $source->annotate_ids('course', 'courseid');
        $source->annotate_ids('course_section', 'sectionid');

        $content->annotate_ids('course', 'courseid');
        $content->annotate_ids('course_section', 'sectionid');
        $content->annotate_ids('user', 'createdby');
        $content->annotate_ids('user', 'approvedby');
        $content->annotate_ids('user', 'publishedby');

        $tracking->annotate_ids('user', 'userid');
        $tracking->annotate_ids('course', 'courseid');

        $feedback->annotate_ids('user', 'userid');
        $feedback->annotate_ids('course', 'courseid');

        // ── Include Moodle file storage (uploaded PDFs) ───────────────────────
        $source->annotate_files('local_lecturebot', 'sources', 'fileitemid');

        return $plugin;
    }
}
