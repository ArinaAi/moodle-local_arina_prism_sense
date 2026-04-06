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
 * Unpublish content - changes status from 'published' back to 'ready'
 *
 * This endpoint reverts content to ready status for re-editing or re-publishing.
 */

define('AJAX_SCRIPT', true);
require_once __DIR__ . '/../../../config.php';

// Get POST data
try {
    $input = \local_arina_prism_sense\Utils::getJsonInput();
    $courseid = $input['courseid'] ?? 0;
    $contentid = $input['contentid'] ?? 0;

    require_login($courseid);
    require_sesskey();

    $content_record = \local_arina_prism_sense\Utils::validateCourseContentRequest($courseid, $contentid);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

try {
    // Check if currently published
    if ($content_record->status !== 'published') {
        http_response_code(400);
        echo json_encode(['error' => 'Content is not currently published']);
        exit;
    }

    // Delete tracking records for this content
    $DB->delete_records('local_arina_prism_sense_tracking', ['contentid' => $contentid]);

    // Update status back to ready
    $update_record = new stdClass();
    $update_record->id = $contentid;
    $update_record->status = 'ready';
    $update_record->timepublished = null;
    $update_record->timemodified = time();

    $DB->update_record('local_arina_prism_sense_content', $update_record);

    echo json_encode([
        'success' => true,
        'message' => 'Content unpublished successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to unpublish content: ' . $e->getMessage()
    ]);
}
