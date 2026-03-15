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
 * LectureBot plugin strings.
 *
 * @package    local_lecturebot
 * @copyright  2024
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

// PDF viewing errors
$string['errorviewingpdf'] = 'Error viewing PDF';
$string['filenotfound'] = 'PDF file not found';
$string['invalidfiletype'] = 'File is not a valid PDF';

// Capabilities
$string['lecturebot:approvecontent'] = 'Approve AI-generated content';
$string['lecturebot:generatecontent'] = 'Generate AI content';
