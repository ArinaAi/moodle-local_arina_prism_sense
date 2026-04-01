<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Marks the PRISM Sense guided tour as seen for the current user.
 * Called by the in-page tour script via fetch().
 *
 * @package    local_lecturebot
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../../config.php');

require_login();
require_sesskey();

$pref = required_param('pref', PARAM_ALPHANUMEXT);

// Allowlist — only our own tour preference keys may be set via this endpoint.
$allowed = [
    'lecturebot_tour_teacher_seen',
    'lecturebot_tour_student_seen',
    'lecturebot_tour_cms_seen',
];

if (!in_array($pref, $allowed)) {
    http_response_code(403);
    echo json_encode(['error' => 'Preference not allowed']);
    exit;
}

set_user_preference($pref, 1);

header('Content-Type: application/json');
echo json_encode(['success' => true]);
