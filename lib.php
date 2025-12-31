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
 * LectureBot plugin for Moodle.
 *
 * @package    local_lecturebot
 * @copyright  2024
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/classes/Utils.php');

use local_lecturebot\Utils;

/**
 * Generate JavaScript code for button creation and event handlers.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_lecturebot_get_button_js($wwwroot)
{
    $buttontext = get_string('generatelecture', 'local_lecturebot');
    
    // Minified logic to inject button
    return <<<JS
        document.addEventListener("DOMContentLoaded", function() {
            // Remove existing button if any
            const existingBtn = document.querySelector(".lecturebot-course-button");
            if (existingBtn) existingBtn.remove();

            // Find injection target
            const targetElement = document.querySelector(".page-header-actions, .page-header-headings") ||
                                  document.querySelector("#page-header, .page-header, header");

            if (targetElement) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "btn btn-primary lecturebot-course-button";
                button.innerHTML = "{$buttontext}";
                button.style.cssText = "margin-top: 10px; background: #0f6cbf; border-color: #0f6cbf; color: white;" +
                    " font-weight: 600; padding: 8px 16px; border-radius: 4px; display: inline-block; cursor: pointer;";

                button.addEventListener("click", function() {
                    if (window.MOODLE_CONTEXT && window.MOODLE_CONTEXT.courseid) {
                        window.location.href = "{$wwwroot}/local/lecturebot/launch.php?courseid=" +
                            window.MOODLE_CONTEXT.courseid;
                    } else {
                        console.error("❌ MOODLE_CONTEXT not available");
                        alert("Unable to open LectureBot. Please refresh the page and try again.");
                    }
                });

                targetElement.appendChild(button);
            }
        });
JS;
}

/**
 * Check if user can access LectureBot on current page.
 *
 * @return bool True if user has access
 */
function local_lecturebot_can_access()
{
    global $PAGE, $COURSE;

    $isCourseView = strpos($PAGE->pagetype, 'course-view') === 0;
    $canUpdate = has_capability(
        'moodle/course:update',
        context_course::instance($COURSE->id)
    );

    return $isCourseView && $canUpdate;
}

/**
 * Inject JavaScript to add button in correct position with proper styling.
 */
function local_lecturebot_before_footer()
{
    global $COURSE, $CFG;

    if (defined('AJAX_SCRIPT') && AJAX_SCRIPT) {
        return;
    }

    if (!local_lecturebot_can_access()) {
        return;
    }

    // Use Utils class to prepare context
    $moodlecontext = Utils::prepare_context($COURSE, $CFG->wwwroot);

    echo '<script>';
    echo "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
    echo local_lecturebot_get_button_js($CFG->wwwroot);
    echo '</script>';
}
