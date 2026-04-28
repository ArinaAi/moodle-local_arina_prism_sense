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
 * Privacy API provider for the local_arina_prism_sense plugin.
 *
 * Declares all personal data collected by this plugin:
 *  - local_arina_prism_sense_content  : createdby / approvedby / publishedby user IDs
 *  - local_arina_prism_sense_tracking : userid (student completion records)
 *  - local_arina_prism_sense_feedback : userid + free-text comments / star rating
 *  - User preference           : arina_prism_sense_wallet_sub_user_id
 *  - External service          : Arina AI API (user UUID sent for credit tracking)
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_arina_prism_sense\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\helper;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider for local_arina_prism_sense.
 */
class provider implements // phpcs:ignore Squiz.Classes.ValidClassName.NotCamelCaps
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    \core_privacy\local\request\core_userlist_provider
{
    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    /**
     * Returns metadata about all personal data this plugin stores.
     *
     * @param collection $collection The metadata collection to add to.
     * @return collection The populated collection.
     */
    public static function get_metadata(collection $collection): collection // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {

        // local_arina_prism_sense_content — stores which user created / approved / published content.
        $collection->add_database_table(
            'local_arina_prism_sense_content',
            [
                'createdby'   => 'privacy:metadata:local_arina_prism_sense_content:createdby',
                'approvedby'  => 'privacy:metadata:local_arina_prism_sense_content:approvedby',
                'publishedby' => 'privacy:metadata:local_arina_prism_sense_content:publishedby',
                'timecreated' => 'privacy:metadata:local_arina_prism_sense_content:timecreated',
            ],
            'privacy:metadata:local_arina_prism_sense_content'
        );

        // local_arina_prism_sense_tracking — student completion records.
        $collection->add_database_table(
            'local_arina_prism_sense_tracking',
            [
                'userid'       => 'privacy:metadata:local_arina_prism_sense_tracking:userid',
                'contentid'    => 'privacy:metadata:local_arina_prism_sense_tracking:contentid',
                'status'       => 'privacy:metadata:local_arina_prism_sense_tracking:status',
                'timecreated'  => 'privacy:metadata:local_arina_prism_sense_tracking:timecreated',
                'timemodified' => 'privacy:metadata:local_arina_prism_sense_tracking:timemodified',
            ],
            'privacy:metadata:local_arina_prism_sense_tracking'
        );

        // local_arina_prism_sense_feedback — user feedback including free-text comments.
        $collection->add_database_table(
            'local_arina_prism_sense_feedback',
            [
                'userid'               => 'privacy:metadata:local_arina_prism_sense_feedback:userid',
                'selected_categories'  => 'privacy:metadata:local_arina_prism_sense_feedback:selected_categories',
                'topics_needing_depth' => 'privacy:metadata:local_arina_prism_sense_feedback:topics_needing_depth',
                'topics_overexplained' => 'privacy:metadata:local_arina_prism_sense_feedback:topics_overexplained',
                'extra_topics'         => 'privacy:metadata:local_arina_prism_sense_feedback:extra_topics',
                'missing_subtopics'    => 'privacy:metadata:local_arina_prism_sense_feedback:missing_subtopics',
                'reordered_flow'       => 'privacy:metadata:local_arina_prism_sense_feedback:reordered_flow',
                'rating'               => 'privacy:metadata:local_arina_prism_sense_feedback:rating',
                'comments'             => 'privacy:metadata:local_arina_prism_sense_feedback:comments',
                'timecreated'          => 'privacy:metadata:local_arina_prism_sense_feedback:timecreated',
            ],
            'privacy:metadata:local_arina_prism_sense_feedback'
        );

        // User preference: wallet sub-user UUID stored for credit tracking.
        $collection->add_user_preference(
            'arina_prism_sense_wallet_sub_user_id',
            'privacy:metadata:preference:arina_prism_sense_wallet_sub_user_id'
        );

        // External service: Arina AI API receives the user's UUID for credit tracking.
        $collection->add_external_location_link(
            'arina_api',
            [
                'user_id' => 'privacy:metadata:arina_api:user_id',
            ],
            'privacy:metadata:arina_api'
        );

        return $collection;
    }

    // -------------------------------------------------------------------------
    // Context discovery
    // -------------------------------------------------------------------------

    /**
     * Returns all contexts that contain personal data for the given user.
     *
     * @param int $userid The user ID to search for.
     * @return contextlist The list of contexts with data for this user.
     */
    public static function get_contexts_for_userid(int $userid): contextlist // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        $contextlist = new contextlist();

        // Content created/approved/published by this user (course context).
        $sql = "SELECT ctx.id
                  FROM {context} ctx
                  JOIN {local_arina_prism_sense_content} c ON c.courseid = ctx.instanceid
                 WHERE ctx.contextlevel = :ctxlevel
                   AND (c.createdby = :uid1 OR c.approvedby = :uid2 OR c.publishedby = :uid3)";
        $contextlist->add_from_sql($sql, [
            'ctxlevel' => CONTEXT_COURSE,
            'uid1'     => $userid,
            'uid2'     => $userid,
            'uid3'     => $userid,
        ]);

        // Tracking records (student completion) — course context.
        $sql = "SELECT ctx.id
                  FROM {context} ctx
                  JOIN {local_arina_prism_sense_tracking} t ON t.courseid = ctx.instanceid
                 WHERE ctx.contextlevel = :ctxlevel
                   AND t.userid = :userid";
        $contextlist->add_from_sql($sql, [
            'ctxlevel' => CONTEXT_COURSE,
            'userid'   => $userid,
        ]);

        // Feedback submitted by this user — course context.
        $sql = "SELECT ctx.id
                  FROM {context} ctx
                  JOIN {local_arina_prism_sense_feedback} f ON f.courseid = ctx.instanceid
                 WHERE ctx.contextlevel = :ctxlevel
                   AND f.userid = :userid";
        $contextlist->add_from_sql($sql, [
            'ctxlevel' => CONTEXT_COURSE,
            'userid'   => $userid,
        ]);

        return $contextlist;
    }

    /**
     * Returns all users who have personal data in the given context.
     *
     * @param userlist $userlist The userlist to populate.
     */
    public static function get_users_in_context(userlist $userlist): void // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        $context = $userlist->get_context();

        if ($context->contextlevel !== CONTEXT_COURSE) {
            return;
        }

        $courseid = $context->instanceid;
        $params   = ['courseid' => $courseid];

        // Users who created, approved, or published content.
        $sql = "SELECT createdby AS userid
                  FROM {local_arina_prism_sense_content}
                 WHERE courseid = :courseid AND createdby IS NOT NULL";
        $userlist->add_from_sql('userid', $sql, $params);

        $sql = "SELECT approvedby AS userid
                  FROM {local_arina_prism_sense_content}
                 WHERE courseid = :courseid AND approvedby IS NOT NULL";
        $userlist->add_from_sql('userid', $sql, $params);

        $sql = "SELECT publishedby AS userid
                  FROM {local_arina_prism_sense_content}
                 WHERE courseid = :courseid AND publishedby IS NOT NULL";
        $userlist->add_from_sql('userid', $sql, $params);

        // Users with tracking records.
        $sql = "SELECT userid
                  FROM {local_arina_prism_sense_tracking}
                 WHERE courseid = :courseid";
        $userlist->add_from_sql('userid', $sql, $params);

        // Users who submitted feedback.
        $sql = "SELECT userid
                  FROM {local_arina_prism_sense_feedback}
                 WHERE courseid = :courseid";
        $userlist->add_from_sql('userid', $sql, $params);
    }

    // -------------------------------------------------------------------------
    // Data export
    // -------------------------------------------------------------------------

    /**
     * Exports all personal data for the user in the given contexts.
     *
     * @param approved_contextlist $contextlist The approved list of contexts.
     */
    public static function export_user_data(approved_contextlist $contextlist): void // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        global $DB;

        $userid = $contextlist->get_user()->id;

        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel !== CONTEXT_COURSE) {
                continue;
            }
            $courseid = $context->instanceid;

            // --- Content records ---
            $content = $DB->get_records_select(
                'local_arina_prism_sense_content',
                'courseid = :courseid AND (createdby = :uid1 OR approvedby = :uid2 OR publishedby = :uid3)',
                ['courseid' => $courseid, 'uid1' => $userid, 'uid2' => $userid, 'uid3' => $userid],
                '',
                'id, title, contenttype, status, createdby, approvedby,
                publishedby, timecreated, timepublished, timeapproved'
            );
            if ($content) {
                writer::with_context($context)->export_data(
                    [get_string('privacy:path:content', 'local_arina_prism_sense')],
                    (object) ['content' => array_values($content)]
                );
            }

            // --- Tracking records ---
            $tracking = $DB->get_records(
                'local_arina_prism_sense_tracking',
                ['userid' => $userid, 'courseid' => $courseid],
                '',
                'id, contentid, status, timecreated, timemodified'
            );
            if ($tracking) {
                writer::with_context($context)->export_data(
                    [get_string('privacy:path:tracking', 'local_arina_prism_sense')],
                    (object) ['tracking' => array_values($tracking)]
                );
            }

            // --- Feedback records ---
            $feedback = $DB->get_records(
                'local_arina_prism_sense_feedback',
                ['userid' => $userid, 'courseid' => $courseid],
                '',
                'id, contentid, feedback_type, selected_categories, rating, comments, timecreated'
            );
            if ($feedback) {
                writer::with_context($context)->export_data(
                    [get_string('privacy:path:feedback', 'local_arina_prism_sense')],
                    (object) ['feedback' => array_values($feedback)]
                );
            }
        }

        // --- User preference ---
        $pref = get_user_preferences('arina_prism_sense_wallet_sub_user_id', null, $userid);
        if ($pref !== null) {
            writer::with_context(\context_user::instance($userid))->export_user_preference(
                'local_arina_prism_sense',
                'arina_prism_sense_wallet_sub_user_id',
                $pref,
                get_string(
                    'privacy:metadata:preference:arina_prism_sense_wallet_sub_user_id',
                    'local_arina_prism_sense'
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    // Data deletion — all users in a context
    // -------------------------------------------------------------------------

    /**
     * Deletes all personal data for all users inside the given context.
     *
     * @param \context $context The context to delete data for.
     */
    public static function delete_data_for_all_users_in_context(\context $context): void // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        global $DB;

        if ($context->contextlevel !== CONTEXT_COURSE) {
            return;
        }
        $courseid = $context->instanceid;

        // Delete tracking records (hard delete — these are purely user-linked).
        $DB->delete_records('local_arina_prism_sense_tracking', ['courseid' => $courseid]);

        // Delete feedback records.
        $DB->delete_records('local_arina_prism_sense_feedback', ['courseid' => $courseid]);

        // Anonymise content records — nullify user ID fields rather than deleting
        // the content item itself (content has value beyond the individual user).
        $DB->set_field('local_arina_prism_sense_content', 'createdby', null, ['courseid' => $courseid]);
        $DB->set_field('local_arina_prism_sense_content', 'approvedby', null, ['courseid' => $courseid]);
        $DB->set_field('local_arina_prism_sense_content', 'publishedby', null, ['courseid' => $courseid]);
    }

    // -------------------------------------------------------------------------
    // Data deletion — specific user
    // -------------------------------------------------------------------------

    /**
     * Deletes all personal data for the specified user in the approved contexts.
     *
     * @param approved_contextlist $contextlist The approved list of contexts.
     */
    public static function delete_data_for_user(approved_contextlist $contextlist): void // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        global $DB;

        $userid = $contextlist->get_user()->id;

        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel !== CONTEXT_COURSE) {
                continue;
            }
            $courseid = $context->instanceid;

            // Delete tracking records for this user in this course.
            $DB->delete_records('local_arina_prism_sense_tracking', [
                'userid'   => $userid,
                'courseid' => $courseid,
            ]);

            // Delete feedback records for this user in this course.
            $DB->delete_records('local_arina_prism_sense_feedback', [
                'userid'   => $userid,
                'courseid' => $courseid,
            ]);

            // Anonymise content authorship — only nullify the fields that
            // point to this specific user, leaving other fields intact.
            $DB->set_field_select(
                'local_arina_prism_sense_content',
                'createdby',
                null,
                'courseid = :courseid AND createdby = :userid',
                ['courseid' => $courseid, 'userid' => $userid]
            );
            $DB->set_field_select(
                'local_arina_prism_sense_content',
                'approvedby',
                null,
                'courseid = :courseid AND approvedby = :userid',
                ['courseid' => $courseid, 'userid' => $userid]
            );
            $DB->set_field_select(
                'local_arina_prism_sense_content',
                'publishedby',
                null,
                'courseid = :courseid AND publishedby = :userid',
                ['courseid' => $courseid, 'userid' => $userid]
            );
        }

        // Delete user preference (wallet UUID).
        unset_user_preference('arina_prism_sense_wallet_sub_user_id', $userid);
    }

    /**
     * Deletes personal data for multiple users within a context.
     *
     * @param approved_userlist $userlist The approved list of users.
     */
    public static function delete_data_for_users(approved_userlist $userlist): void // phpcs:ignore PSR1.Methods.CamelCapsMethodName.NotCamelCaps
    {
        global $DB;

        $context = $userlist->get_context();
        if ($context->contextlevel !== CONTEXT_COURSE) {
            return;
        }

        $courseid = $context->instanceid;
        $userids  = $userlist->get_userids();

        if (empty($userids)) {
            return;
        }

        [$insql, $inparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED);

        // Delete tracking records for these users.
        $DB->delete_records_select(
            'local_arina_prism_sense_tracking',
            "courseid = :courseid AND userid $insql",
            array_merge(['courseid' => $courseid], $inparams)
        );

        // Delete feedback records for these users.
        $DB->delete_records_select(
            'local_arina_prism_sense_feedback',
            "courseid = :courseid AND userid $insql",
            array_merge(['courseid' => $courseid], $inparams)
        );

        // Anonymise content authorship fields.
        $DB->set_field_select(
            'local_arina_prism_sense_content',
            'createdby',
            null,
            "courseid = :courseid1 AND createdby $insql",
            array_merge(['courseid1' => $courseid], $inparams)
        );
        $DB->set_field_select(
            'local_arina_prism_sense_content',
            'approvedby',
            null,
            "courseid = :courseid2 AND approvedby $insql",
            array_merge(['courseid2' => $courseid], $inparams)
        );
        $DB->set_field_select(
            'local_arina_prism_sense_content',
            'publishedby',
            null,
            "courseid = :courseid3 AND publishedby $insql",
            array_merge(['courseid3' => $courseid], $inparams)
        );
    }
}
