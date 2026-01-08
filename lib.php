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
        (function() {
            function initLectureBotAdmin() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".lecturebot-course-button");
                if (existingBtn) existingBtn.remove();

                // Find injection target
                const targetElement = document.querySelector(".page-header-actions") ||
                                    document.querySelector(".page-header-headings") ||
                                    document.querySelector("#page-header .d-flex") ||
                                    document.querySelector(".header-maxwidth") ||
                                    document.querySelector("header");

                if (targetElement) {
                    console.log("LectureBot: Found admin target", targetElement);
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "btn btn-primary lecturebot-course-button";
                    button.innerHTML = "{$buttontext}";
                    button.style.cssText = "margin-top: 10px; margin-right: 15px; background: #0f6cbf;" +
                        " border-color: #0f6cbf; color: white;" +
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

                    // Prefer prepending to actions
                    if (targetElement.classList.contains('page-header-actions')) {
                        targetElement.prepend(button);
                    } else {
                        targetElement.appendChild(button);
                    }
                } else {
                     console.log("LectureBot: No admin target element found");
                }
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initLectureBotAdmin);
            } else {
                initLectureBotAdmin();
            }
        })();
JS;
}

/**
 * Generate JavaScript code for student button creation.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_lecturebot_get_student_button_js($wwwroot)
{
    $buttontext = get_string('courseplayer', 'local_lecturebot'); // We need to add this string too
    if (empty($buttontext) || $buttontext == '[[courseplayer]]') {
        $buttontext = 'Start Course';
    }
    
    return <<<JS
        (function() {
            function initLectureBotStudent() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".lecturebot-student-button");
                if (existingBtn) existingBtn.remove();

                // Find injection target - Student view might differ
                const targetElement = document.querySelector(".page-header-actions") ||
                                    document.querySelector(".page-header-headings") ||
                                    document.querySelector("#page-header .d-flex") ||
                                    document.querySelector(".header-maxwidth") ||
                                    document.querySelector("header");

                if (targetElement) {
                    console.log("LectureBot: Found student target", targetElement);
                    const button = document.createElement("a");
                    button.className = "btn btn-primary lecturebot-student-button"; // Changed to btn-primary
                    button.innerHTML = '<i class="fa fa-play-circle" aria-hidden="true"></i> ' + "{$buttontext}";
                    button.href = "#";
                    // Matched colors: background: #0f6cbf; border-color: #0f6cbf; color: white;
                    button.style.cssText = "margin-top: 10px; margin-right: 10px; background: #0f6cbf; " +
                        "border-color: #0f6cbf; color: white; " +
                        "font-weight: 600; padding: 8px 16px; border-radius: 4px; " +
                        "display: inline-block; cursor: pointer;";

                    button.addEventListener("click", function(e) {
                        e.preventDefault();
                        if (window.MOODLE_CONTEXT && window.MOODLE_CONTEXT.courseid) {
                            window.location.href = "{$wwwroot}/local/lecturebot/student_view.php?courseid=" +
                                window.MOODLE_CONTEXT.courseid;
                        } else {
                            console.error("❌ MOODLE_CONTEXT not available");
                        }
                    });

                    // Prepend or Append?
                    // If page-header-actions, append to behave like other actions
                    if (targetElement.classList.contains('page-header-actions')) {
                         targetElement.insertBefore(button, targetElement.firstChild);
                    } else {
                         targetElement.appendChild(button);
                    }
                } else {
                    console.log("LectureBot: No student target element found");
                }
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initLectureBotStudent);
            } else {
                initLectureBotStudent();
            }
        })();
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
 * Check if user can access Student View.
 *
 * @return bool True if user has access
 */
function local_lecturebot_can_access_student()
{
    global $PAGE, $COURSE, $USER;

    $isCourseView = strpos($PAGE->pagetype, 'course-view') === 0;
    
    // Check if course is valid
    if (!isset($COURSE->id) || $COURSE->id == 1) { // 1 is frontpage
        return false;
    }

    $context = context_course::instance($COURSE->id);

    // Allow if they can update (Teacher) OR are enrolled (Student)
    // is_enrolled(context, user, withcapability, onlyactive)
    $isEnrolled = is_enrolled($context, $USER, '', true);
    
    // Also allow managers/teachers who might not be "enrolled" but have update rights
    $canUpdate = has_capability('moodle/course:update', $context);

    return $isCourseView && ($isEnrolled || $canUpdate);
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

    // Use Utils class to prepare context if we are going to inject anything
    $contextPrepared = false;
    $jsToInject = '';

    // 1. Teacher Button
    if (local_lecturebot_can_access()) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepare_context($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_lecturebot_get_button_js($CFG->wwwroot);
    }

    // 2. Student Button
    // We show this to students, AND teachers (so they can preview)
    $canAccessStudent = local_lecturebot_can_access_student();
    
    if ($canAccessStudent) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepare_context($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_lecturebot_get_student_button_js($CFG->wwwroot);
    }

    if ($jsToInject !== '') {
        echo '<script>';
        echo $jsToInject;
        echo '</script>';
    }
}
