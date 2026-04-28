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
 * Arina Prism Sense plugin strings.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'PRISM Sense';
$string['generatelecture'] = 'Generate AI Lecture';
$string['generating'] = 'Generating Lecture...';
$string['creditmanagement'] = 'Credit Management';
$string['task:generate_content_task'] = 'Generate PRISM Sense Content';
$string['task:poll_content_status'] = 'Poll Content Generation Status';
$string['courseplayer'] = 'Start Course';
$string['unabletoopenprism'] = 'Unable to open PRISM Sense. Please refresh the page and try again.';

// PDF viewing errors
$string['errorviewingpdf'] = 'Error viewing PDF';
$string['filenotfound'] = 'PDF file not found';
$string['invalidfiletype'] = 'File is not a valid PDF';

// Capabilities
$string['arina_prism_sense:approvecontent'] = 'Approve AI-generated content';
$string['arina_prism_sense:generatecontent'] = 'Generate AI content';

// ── Settings page ─────────────────────────────────────────────────────────────
$string['settings:pagetitle'] = 'PRISM Sense';
$string['settings:apikey'] = 'Arina API Key (Global / Fallback)';
$string['settings:apikey_desc'] = 'Global API key. Used on standalone Moodle installs (without IOMAD). ' .
    'For IOMAD multi-tenant setups, configure per-company API keys via the ' .
    '<a href="{$a}">Company Settings</a> page instead.';
$string['settings:orgid'] = 'Arina Org ID (Global / Fallback)';
$string['settings:orgid_desc'] = 'Global organization identity. Used on standalone Moodle installs (without IOMAD).';
$string['settings:register_heading'] = 'Arina.ai Registration';
$string['settings:register_desc'] = 'Don\'t have an Org ID or API Key? ' .
    'Enter a new password below and click "Register" to create an Arina.ai ' .
    'account via the Auth Service and automatically configure your Moodle plugin.';
$string['settings:iomad_heading'] = 'IOMAD Multi-Tenant Configuration';
$string['settings:iomad_link'] = '⚙ Configure Per-Company API Keys';

// ── Privacy API ───────────────────────────────────────────────────────────────

// Table: local_arina_prism_sense_content
$string['privacy:metadata:local_arina_prism_sense_content'] =
    'Records of AI-generated content items, including which user created, approved, and published each item.';
$string['privacy:metadata:local_arina_prism_sense_content:createdby'] =
    'The ID of the user who requested the content generation.';
$string['privacy:metadata:local_arina_prism_sense_content:approvedby'] =
    'The ID of the user who approved the generated content.';
$string['privacy:metadata:local_arina_prism_sense_content:publishedby'] =
    'The ID of the user who published the content to the course.';
$string['privacy:metadata:local_arina_prism_sense_content:timecreated'] =
    'The date and time the content generation was requested.';

// Table: local_arina_prism_sense_tracking
$string['privacy:metadata:local_arina_prism_sense_tracking'] =
    'Records tracking which users have completed (viewed) AI-generated content items.';
$string['privacy:metadata:local_arina_prism_sense_tracking:userid'] =
    'The ID of the student whose completion is being tracked.';
$string['privacy:metadata:local_arina_prism_sense_tracking:contentid'] =
    'The ID of the content item that was completed.';
$string['privacy:metadata:local_arina_prism_sense_tracking:status'] =
    'Completion status of the content item (1 = complete).';
$string['privacy:metadata:local_arina_prism_sense_tracking:timecreated'] =
    'The date and time the tracking record was created.';
$string['privacy:metadata:local_arina_prism_sense_tracking:timemodified'] =
    'The date and time the tracking record was last updated.';

// Table: local_arina_prism_sense_feedback
$string['privacy:metadata:local_arina_prism_sense_feedback'] =
    'Feedback submitted by users on AI-generated content, which may include free-text comments and star ratings.';
$string['privacy:metadata:local_arina_prism_sense_feedback:userid'] =
    'The ID of the user who submitted the feedback.';
$string['privacy:metadata:local_arina_prism_sense_feedback:selected_categories'] =
    'The feedback categories selected by the user (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:topics_needing_depth'] =
    'Topics the user flagged as needing more detail (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:topics_overexplained'] =
    'Topics the user flagged as over-explained (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:extra_topics'] =
    'Topics the user flagged as unwanted or off-topic (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:missing_subtopics'] =
    'Subtopics or keywords the user noted as missing (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:reordered_flow'] =
    'The desired topic order suggested by the user (JSON array).';
$string['privacy:metadata:local_arina_prism_sense_feedback:rating'] =
    'An optional 1–5 star rating given by the user.';
$string['privacy:metadata:local_arina_prism_sense_feedback:comments'] =
    'Optional free-text comments written by the user.';
$string['privacy:metadata:local_arina_prism_sense_feedback:timecreated'] =
    'The date and time the feedback was submitted.';

// User preference
$string['privacy:metadata:preference:arina_prism_sense_wallet_sub_user_id'] =
    'A UUID that links this Moodle user to their Arina credit wallet account for usage tracking.';

// External service: Arina AI API
$string['privacy:metadata:arina_api'] =
    'This plugin sends data to the Arina AI service to generate educational content and track credit usage. ' .
    'The user\'s unique identifier (UUID) is transmitted for credit and usage tracking.';
$string['privacy:metadata:arina_api:user_id'] =
    'A unique identifier (UUID) for the user, sent to the Arina API for credit tracking purposes.';

// Export path labels
$string['privacy:path:content'] = 'Generated Content';
$string['privacy:path:tracking'] = 'Content Completion';
$string['privacy:path:feedback'] = 'Content Feedback';
