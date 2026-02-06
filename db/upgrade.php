<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Upgrade script for local_lecturebot
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();
// NOSONAR - This file contains Moodle upgrade functions with necessary patterns
// Each function follows required Moodle DB upgrade structure

/**
 * Upgrade the local_lecturebot plugin.
 *
 * @param int $oldversion The old version of the plugin
 * @return bool
 */
function xmldb_local_lecturebot_upgrade($oldversion)
{
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2025121300) {
        local_lecturebot_upgrade_2025121300($dbman);
    }

    if ($oldversion < 2025121601) {
        local_lecturebot_upgrade_2025121601($dbman);
    }

    if ($oldversion < 2025121900) {
        local_lecturebot_upgrade_2025121900($dbman);
    }

    if ($oldversion < 2025122201) {
        local_lecturebot_upgrade_2025122201($dbman);
    }

    if ($oldversion < 2026010500) {
        local_lecturebot_upgrade_2026010500($dbman);
    }

    if ($oldversion < 2026011400) {
        local_lecturebot_upgrade_2026011400($dbman);
    }

    if ($oldversion < 2026020500) {
        local_lecturebot_upgrade_2026020500($dbman);
    }

    if ($oldversion < 2026020600) {
        local_lecturebot_upgrade_2026020600($dbman);
    }

    return true;
}

function local_lecturebot_upgrade_2025121300($dbman)
{
    // Define table local_lecturebot_sources to be created.
    $table = new xmldb_table('local_lecturebot_sources');

    // Adding fields to table local_lecturebot_sources.
    $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
    $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('sectionid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('filename', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL, null, null);
    $table->add_field('fileitemid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('filesize', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

    // Adding keys to table local_lecturebot_sources.
    $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
    $table->add_key('courseid', XMLDB_KEY_FOREIGN, ['courseid'], 'course', ['id']);

    // Adding indexes to table local_lecturebot_sources.
    $table->add_index('courseid_sectionid', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'sectionid']);

    // Conditionally launch create table for local_lecturebot_sources.
    if (!$dbman->table_exists($table)) {
        $dbman->create_table($table);
    }

    // Define table local_lecturebot_content to be created.
    $table = new xmldb_table('local_lecturebot_content');

    // Adding fields to table local_lecturebot_content.
    $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
    $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('sectionid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('contenttype', XMLDB_TYPE_CHAR, '50', null, XMLDB_NOTNULL, null, null);
    $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'queued');
    $table->add_field('title', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL, null, null);

    $table->add_field('generationdata', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table->add_field('errormessage', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('timepublished', XMLDB_TYPE_INTEGER, '10', null, null, null, null);
    $table->add_field('cmid', XMLDB_TYPE_INTEGER, '10', null, null, null, null);

    // Adding keys to table local_lecturebot_content.
    $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
    $table->add_key('courseid', XMLDB_KEY_FOREIGN, ['courseid'], 'course', ['id']);

    // Adding indexes to table local_lecturebot_content.
    $table->add_index('courseid_status', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'status']);
    $table->add_index('courseid_sectionid', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'sectionid']);

    // Conditionally launch create table for local_lecturebot_content.
    if (!$dbman->table_exists($table)) {
        $dbman->create_table($table);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2025121300, 'local', 'lecturebot');
}

function local_lecturebot_upgrade_2025121601($dbman)
{
    // Define fields to be added to local_lecturebot_content for approval tracking.
    $table = new xmldb_table('local_lecturebot_content');

    // Add approved field (0 = not approved, 1 = approved).
    $field = new xmldb_field('approved', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'cmid');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add approvedby field (user ID who approved).
    $field = new xmldb_field('approvedby', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'approved');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add timeapproved field (timestamp when approved).
    $field = new xmldb_field('timeapproved', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'approvedby');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add foreign key for approvedby.
    $key = new xmldb_key('approvedby', XMLDB_KEY_FOREIGN, ['approvedby'], 'user', ['id']);
    $dbman->add_key($table, $key);

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2025121601, 'local', 'lecturebot');
}

function local_lecturebot_upgrade_2025121900($dbman)
{
    // Define field fileitemid to be dropped from local_lecturebot_content.
    $table = new xmldb_table('local_lecturebot_content');
    $field = new xmldb_field('fileitemid');

    // Conditionally launch drop field fileitemid.
    if ($dbman->field_exists($table, $field)) {
        $dbman->drop_field($table, $field);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2025121900, 'local', 'lecturebot');
}

function local_lecturebot_upgrade_2025122201($dbman)
{
    // Define field title to be added to local_lecturebot_sources.
    $table = new xmldb_table('local_lecturebot_sources');
    $field = new xmldb_field('title', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'filesize');

    // Conditionally launch add field title.
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Define field author to be added to local_lecturebot_sources.
    $fieldAuthor = new xmldb_field('author', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'title');

    // Conditionally launch add field author.
    if (!$dbman->field_exists($table, $fieldAuthor)) {
        $dbman->add_field($table, $fieldAuthor);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2025122201, 'local', 'lecturebot');
}

function local_lecturebot_upgrade_2026010500($dbman)
{
    // Define table local_lecturebot_tracking to be created.
    $table = new xmldb_table('local_lecturebot_tracking');

    // Adding fields to table local_lecturebot_tracking.
    $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
    $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('contentid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('status', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
    $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

    // Adding keys to table local_lecturebot_tracking.
    $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
    $table->add_key('userid', XMLDB_KEY_FOREIGN, ['userid'], 'user', ['id']);
    $table->add_key('contentid', XMLDB_KEY_FOREIGN, ['contentid'], 'local_lecturebot_content', ['id']);

    // Adding indexes to table local_lecturebot_tracking.
    $table->add_index('userid_contentid', XMLDB_INDEX_UNIQUE, ['userid', 'contentid']);

    // Conditionally launch create table for local_lecturebot_tracking.
    if (!$dbman->table_exists($table)) {
        $dbman->create_table($table);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2026010500, 'local', 'lecturebot');
}

function local_lecturebot_upgrade_2026010700($dbman)
{
    // Define table local_lecturebot_sources to be modified.
    $table = new xmldb_table('local_lecturebot_sources');

    // Define field title to be added to local_lecturebot_sources.
    $fieldTitle = new xmldb_field('title', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'filesize');

    // Conditionally launch add field title.
    if (!$dbman->field_exists($table, $fieldTitle)) {
        $dbman->add_field($table, $fieldTitle);
    }

    // Define field author to be added to local_lecturebot_sources.
    $fieldAuthor = new xmldb_field('author', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'title');

    // Conditionally launch add field author.
    if (!$dbman->field_exists($table, $fieldAuthor)) {
        $dbman->add_field($table, $fieldAuthor);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2026010700, 'local', 'lecturebot');
}

/**
 * Upgrade to add request_id field for Kafka async tracking
 */
function local_lecturebot_upgrade_2026011400($dbman)
{
    // Define field request_id to be added to local_lecturebot_content.
    $table = new xmldb_table('local_lecturebot_content');
    $field = new xmldb_field('request_id', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'timeapproved');

    // Conditionally launch add field request_id.
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Lecturebot savepoint reached.
    upgrade_plugin_savepoint(true, 2026011400, 'local', 'lecturebot');
}

/**
 * Upgrade to add createdby and publishedby fields and remove unused cmid field
 */
function local_lecturebot_upgrade_2026020500($dbman)
{
    $table = new xmldb_table('local_lecturebot_content');

    // Add createdby field.
    $field = new xmldb_field('createdby', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'request_id');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add publishedby field.
    $field = new xmldb_field('publishedby', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'createdby');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }
    
    // Add foreign keys
    $key = new xmldb_key('createdby', XMLDB_KEY_FOREIGN, ['createdby'], 'user', ['id']);
    $dbman->add_key($table, $key);
    
    $key = new xmldb_key('publishedby', XMLDB_KEY_FOREIGN, ['publishedby'], 'user', ['id']);
    $dbman->add_key($table, $key);

    // Remove cmid field
    $field = new xmldb_field('cmid');
    if ($dbman->field_exists($table, $field)) {
        $dbman->drop_field($table, $field);
    }

    upgrade_plugin_savepoint(true, 2026020500, 'local', 'lecturebot');
}

/**
 * Upgrade to add feedback table and content linkage
 */
function local_lecturebot_upgrade_2026020600($dbman)
{
    global $DB;
    $table = new xmldb_table('local_lecturebot_content');

    // Add parent_content_id field.
    $field = new xmldb_field('parent_content_id', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'publishedby');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add feedback_id field.
    $field = new xmldb_field('feedback_id', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'parent_content_id');
    if (!$dbman->field_exists($table, $field)) {
        $dbman->add_field($table, $field);
    }

    // Add foreign key for parent_content_id.
    $key = new xmldb_key(
        'parent_content_id',
        XMLDB_KEY_FOREIGN,
        ['parent_content_id'],
        'local_lecturebot_content',
        ['id']
        );
    $dbman->add_key($table, $key);

    // Create local_lecturebot_feedback table.
    $table_fb = new xmldb_table('local_lecturebot_feedback');

    $table_fb->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
    $table_fb->add_field('contentid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table_fb->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table_fb->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
    $table_fb->add_field('feedback_type', XMLDB_TYPE_CHAR, '50', null, XMLDB_NOTNULL, null, 'structured');
    $table_fb->add_field('selected_categories', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('topics_needing_depth', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('topics_overexplained', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('extra_topics', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('missing_subtopics', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('reordered_flow', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('rating', XMLDB_TYPE_INTEGER, '1', null, null, null, null);
    $table_fb->add_field('comments', XMLDB_TYPE_TEXT, null, null, null, null, null);
    $table_fb->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

    $table_fb->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
    $table_fb->add_key('contentid', XMLDB_KEY_FOREIGN, ['contentid'], 'local_lecturebot_content', ['id']);
    $table_fb->add_key('courseid', XMLDB_KEY_FOREIGN, ['courseid'], 'course', ['id']);
    $table_fb->add_key('userid', XMLDB_KEY_FOREIGN, ['userid'], 'user', ['id']);

    if (!$dbman->table_exists($table_fb)) {
        $dbman->create_table($table_fb);
    }

    upgrade_plugin_savepoint(true, 2026020600, 'local', 'lecturebot');
}
