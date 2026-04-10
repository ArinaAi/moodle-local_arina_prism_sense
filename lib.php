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
 * PRISM Sense plugin for Moodle.
 *
 * @package    local_arina_prism_sense
 * @copyright  2024 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/classes/Utils.php');
require_once(__DIR__ . '/configurator_azure.php');
require_once(__DIR__ . '/config_api.php');

use local_arina_prism_sense\Utils;

define('SCRIPT_START', '<script>');
define('SCRIPT_END', '</script>');

/**
 * Generate JavaScript code for button creation and event handlers.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_arina_prism_sense_get_button_js($wwwroot)
{
    $buttontext = get_string('generatelecture', 'local_arina_prism_sense');
    $unabletoopen = get_string('unabletoopenprism', 'local_arina_prism_sense');

    // Minified logic to inject button
    return <<<JS
        (function() {
            function initLectureBotAdmin() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".arina_prism_sense-course-button");
                if (existingBtn) {existingBtn.remove()};

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
                    button.className = "btn btn-primary arina_prism_sense-course-button";
                    button.innerHTML = "{$buttontext}";
                    button.style.cssText = "margin-top: 10px; margin-right: 15px; background: #0f6cbf;" +
                        " border-color: #0f6cbf; color: white;" +
                        " font-weight: 600; padding: 8px 16px; border-radius: 4px; display: " +
                        "inline-block; cursor: pointer;";

                    button.addEventListener("click", function() {
                        if (window.MOODLE_CONTEXT && window.MOODLE_CONTEXT.courseid) {
                            window.location.href = "{$wwwroot}/local/arina_prism_sense/launch.php?courseid=" +
                                window.MOODLE_CONTEXT.courseid;
                        } else {
                            console.error("❌ MOODLE_CONTEXT not available");
                            alert("{$unabletoopen}");
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
function local_arina_prism_sense_get_student_button_js($wwwroot)
{
    $buttontext = get_string('courseplayer', 'local_arina_prism_sense'); // We need to add this string too
    if (empty($buttontext) || $buttontext == '[[courseplayer]]') {
        $buttontext = 'Start Course';
    }

    return <<<JS
        (function() {
            function initLectureBotStudent() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".arina_prism_sense-student-button");
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
                    button.className = "btn btn-primary arina_prism_sense-student-button"; // Changed to btn-primary
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
                            window.location.href = "{$wwwroot}/local/arina_prism_sense/student_view.php?courseid=" +
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
function local_arina_prism_sense_can_access()
{
    global $PAGE, $COURSE;

    $isCourseView = strpos($PAGE->pagetype, 'course-view') === 0;
    $canUpdate = has_capability(
        CAPABILITY_GENERATE_CONTENT,
        context_course::instance($COURSE->id)
    );

    return $isCourseView && $canUpdate;
}

/**
 * Check if user can access Student View.
 *
 * @return bool True if user has access
 */
function local_arina_prism_sense_can_access_student()
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
    $canUpdate = has_capability(CAPABILITY_GENERATE_CONTENT, $context);

    return $isCourseView && ($isEnrolled || $canUpdate);
}

/**
 * Inject JavaScript to add button in correct position with proper styling.
 */
function local_arina_prism_sense_before_footer()
{
    global $COURSE, $CFG;

    if (defined('AJAX_SCRIPT') && AJAX_SCRIPT) {
        return;
    }

    // Use Utils class to prepare context if we are going to inject anything
    $contextPrepared = false;
    $jsToInject = '';

    // 1. Teacher Button
    if (local_arina_prism_sense_can_access()) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepareContext($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_arina_prism_sense_get_button_js($CFG->wwwroot);
    }

    // 2. Student Button
    // We show this to students, AND teachers (so they can preview)
    $canAccessStudent = local_arina_prism_sense_can_access_student();

    if ($canAccessStudent) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepareContext($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_arina_prism_sense_get_student_button_js($CFG->wwwroot);
    }

    if ($jsToInject !== '') {
        echo SCRIPT_START;
        echo $jsToInject;
        echo SCRIPT_END;
    }

    // Inject Credit Management link for Site Admins and IOMAD Company Managers.
    if (local_arina_prism_sense_user_can_access_cms()) {
        echo SCRIPT_START;
        echo local_arina_prism_sense_get_cms_menu_js($CFG->wwwroot);
        echo SCRIPT_END;
    }

    // Modern Login Page Styling
    if (local_arina_prism_sense_is_login_page()) {
        echo '<style>' . local_arina_prism_sense_get_login_css() . '</style>';
        echo SCRIPT_START . local_arina_prism_sense_get_login_js() . SCRIPT_END;
    }
}

/**
 * Returns true if the current user is allowed to access the CMS dashboard.
 *
 * Grants access to:
 *  (a) Moodle Site Admins, OR
 *  (b) IOMAD Company Managers (managertype = 1 in mdl_company_users)
 *
 * This is the lib.php companion to CompanyConfig::requireCmsAccess().
 * It is a pure boolean check (no exception thrown) so it is safe to use
 * in navigation hooks and page_init callbacks where throwing would break
 * unrelated     pages.
 *
 * @return bool
 */
function local_arina_prism_sense_user_can_access_cms(): bool
{
    global $USER, $DB;

    if (!isloggedin() || isguestuser()) {
        return false;
    }

    // Site Admins and IOMAD Company Managers (managertype = 1) may access CMS.
    // Return early for site admins; for others check IOMAD company_users table.
    $isIomad = \core_plugin_manager::instance()->get_plugin_info('local_iomad') !== null;
    return is_siteadmin() || (
        $isIomad && $DB->record_exists_select(
            'company_users',
            'userid = :uid AND managertype = 1',
            ['uid' => $USER->id]
        )
    );
}

/**
 * Generate JavaScript to inject Credit Management link into user menu.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_arina_prism_sense_get_cms_menu_js($wwwroot)
{
    $creditmanagement = get_string('creditmanagement', 'local_arina_prism_sense');
    return <<<JS
        (function() {
            function injectCMSLink() {
                // Check if link already exists
                if (document.querySelector('.arina_prism_sense-cms-link')) {
                    return;
                }

                // Try multiple strategies to find menu items
                // Strategy 1: Find existing menu links and insert nearby
                const profileLink = document.querySelector('a[href*="/user/profile.php"]');
                const gradesLink = document.querySelector('a[href*="/grade/report"]');
                const logoutLink = document.querySelector('a[href*="/login/logout.php"]');
                
                let targetLink = profileLink || gradesLink || logoutLink;
                
                if (!targetLink) {
                    console.log('LectureBot CMS: Could not find reference menu items');
                    return;
                }

                // Create the menu item
                const menuItem = document.createElement('a');
                menuItem.className = targetLink.className + ' arina_prism_sense-cms-link';
                menuItem.role = 'menuitem';
                menuItem.href = '{$wwwroot}/local/arina_prism_sense/cms.php';
                menuItem.rel = 'noopener noreferrer';
                
                // Clone the structure of existing items
                const iconSpan = document.createElement('span');
                iconSpan.className = 'menu-action-icon icon fa fa-tachometer-alt fa-fw';
                iconSpan.setAttribute('aria-hidden', 'true');
                
                const textSpan = document.createElement('span');
                textSpan.className = 'menu-action-text';
                textSpan.textContent = '{$creditmanagement}';
                
                menuItem.appendChild(iconSpan);
                menuItem.appendChild(textSpan);

                // Insert before logout if it exists, otherwise after profile
                if (logoutLink) {
                    logoutLink.parentNode.insertBefore(menuItem, logoutLink);
                } else if (profileLink) {
                    profileLink.parentNode.insertBefore(menuItem, profileLink.nextSibling);
                } else {
                    targetLink.parentNode.appendChild(menuItem);
                }
                
                console.log('LectureBot CMS: Link injected into user menu');
            }

            // Try multiple times to catch dynamic loading
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', injectCMSLink);
            } else {
                injectCMSLink();
            }
            
            setTimeout(injectCMSLink, 500);
            setTimeout(injectCMSLink, 1500);
            setTimeout(injectCMSLink, 3000);
        })();
JS;
}

/**
 * Check if current page is the login page.
 *
 * @return bool True if on login page
 */
function local_arina_prism_sense_is_login_page()
{
    global $PAGE;
    return $PAGE->pagetype === 'login-index';
}

/**
 * Get modern login page CSS.
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_css()
{
    return local_arina_prism_sense_get_login_base_css()
        . local_arina_prism_sense_get_login_form_css()
        . local_arina_prism_sense_get_login_button_css();
}

/**
 * Get base login page CSS (hide elements, background, card styling).
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_base_css()
{
    return local_arina_prism_sense_get_login_layout_css()
        . local_arina_prism_sense_get_login_welcome_css()
        . local_arina_prism_sense_get_login_footer_css()
        . local_arina_prism_sense_get_login_responsive_css();
}

/**
 * Get login layout CSS.
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_layout_css()
{
    return <<<CSS
        /* ===== LOGIN PAGE BASE STYLES ===== */
        
        /* Hide Moodle UI Elements on Login Page */
        body.pagelayout-login #usernavigation,
        body.pagelayout-login [data-region="drawer-toggle"],
        body.pagelayout-login .btn-footer-popover,
        body.pagelayout-login button[data-action="footer-popover"],
        body.pagelayout-login #page-footer,
        body.pagelayout-login footer.footer-popover,
        body.pagelayout-login .footer-popover,
        body.pagelayout-login .footer-content-popover,
        body.pagelayout-login .footer-section,
        body.pagelayout-login .logininfo,
        body.pagelayout-login .tool_dataprivacy,
        body.pagelayout-login .tool_policy,
        body.pagelayout-login #theme_switch_link,
        body.pagelayout-login .tool_usertours-resettourcontainer {
            display: none !important;
        }
        
        /* Modern Login Container - Fluid Responsive */
        #page-login-index .login-container {
            border-radius: clamp(12px, 4vw, 20px) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
                        0 2px 8px rgba(0, 0, 0, 0.08) !important;
            padding: clamp(20px, 5vh, 48px) clamp(16px, 5vw, 40px) clamp(20px, 4vh, 40px) !important;
            max-width: min(420px, calc(100vw - 32px)) !important;
            margin: clamp(16px, 3vh, 40px) auto !important;
            animation: slideUp 0.6s ease-out;
            position: relative;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Logo Enhancement - Fluid Responsive (scales with viewport height) */
        #page-login-index #loginlogo img,
        #page-login-index .login-logo img {
            max-height: clamp(64px, 16vw, 125px) !important;
            width: auto !important;
            margin-bottom: clamp(6px, min(2vw, 1.5vh), 16px) !important;
            transition: transform 0.3s ease !important;
        }
        
        /* Logo container */
        #page-login-index #loginlogo,
        #page-login-index .login-logo {
            text-align: center !important;
            margin-bottom: 0 !important;
        }
CSS;
}

/**
 * Get login welcome CSS.
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_welcome_css()
{
    return <<<CSS
        /* Custom Welcome Section Styles - Fluid Responsive */
        .arina_prism_sense-welcome-section {
            text-align: center;
            margin-bottom: clamp(16px, 3vh, 28px);
            animation: fadeIn 0.8s ease-out 0.3s both;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .arina_prism_sense-welcome-title {
            font-size: clamp(18px, 4vw, 26px);
            font-weight: 700;
            color: #1a1a2e;
            margin: 0 0 clamp(6px, 1vh, 8px) 0;
            letter-spacing: -0.5px;
            line-height: 1.2;
        }
        
        .arina_prism_sense-welcome-subtitle {
            font-size: clamp(12px, 2.5vw, 15px);
            color: #6b7280;
            margin: 0;
            font-weight: 400;
            line-height: 1.4;
        }
        
        /* Divider line - Fluid Responsive */
        .arina_prism_sense-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: clamp(16px, 3vh, 24px) 0;
        }
CSS;
}

/**
 * Get login footer CSS.
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_footer_css()
{
    return <<<CSS
        /* Footer Styles - Fluid Responsive */
        .arina_prism_sense-login-footer {
            text-align: center;
            margin-top: clamp(20px, 4vh, 32px);
            padding-top: clamp(16px, 3vh, 24px);
            border-top: 1px solid #f0f0f0;
            animation: fadeIn 0.8s ease-out 0.5s both;
        }
        
        .arina_prism_sense-footer-text {
            font-size: clamp(11px, 2vw, 12px);
            color: #9ca3af;
            margin: 0 0 clamp(3px, 0.5vh, 4px) 0;
        }
        
        .arina_prism_sense-footer-brand {
            font-size: clamp(12px, 2.2vw, 13px);
            color: #6b7280;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: clamp(4px, 1vw, 6px);
        }
        
        .arina_prism_sense-footer-brand svg {
            width: clamp(12px, 2.5vw, 14px);
            height: clamp(12px, 2.5vw, 14px);
        }
        
        /* Feature highlights - Fluid Responsive */
        .arina_prism_sense-features {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: clamp(12px, 3vw, 20px);
            margin-top: clamp(12px, 2vh, 16px);
            animation: fadeIn 0.8s ease-out 0.6s both;
        }
        
        .arina_prism_sense-feature {
            display: flex;
            align-items: center;
            gap: clamp(4px, 1vw, 6px);
            font-size: clamp(11px, 2vw, 12px);
            color: #6b7280;
        }
        
        .arina_prism_sense-feature svg {
            width: clamp(12px, 2.5vw, 14px);
            height: clamp(12px, 2.5vw, 14px);
            color: #10b981;
        }
CSS;
}

/**
 * Get login responsive CSS.
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_responsive_css()
{
    return <<<CSS
        /* ===== HEIGHT-BASED RESPONSIVE ADJUSTMENTS ===== */
        
        /* For screens shorter than 700px (like MacBook Pro 13" at 640px) */
        @media (max-height: 700px) {
            /* Hide decorative footer features to save space */
            .arina_prism_sense-features {
                display: none !important;
            }
            
            /* Reduce welcome section spacing */
            .arina_prism_sense-welcome-section {
                margin-bottom: 12px !important;
            }
            
            .arina_prism_sense-welcome-title {
                font-size: 20px !important;
                margin-bottom: 4px !important;
            }
            
            .arina_prism_sense-welcome-subtitle {
                font-size: 13px !important;
            }
            
            /* Reduce container padding more aggressively */
            #page-login-index .login-container {
                padding: 16px 20px 16px !important;
                margin: 12px auto !important;
            }
            
            /* Reduce form spacing */
            #page-login-index .login-form-username,
            #page-login-index .login-form-password,
            #page-login-index .login-form-submit,
            #page-login-index .login-form-forgotpassword {
                margin-bottom: 12px !important;
            }
            
            /* Reduce footer spacing */
            .arina_prism_sense-login-footer {
                margin-top: 16px !important;
                padding-top: 12px !important;
            }
        }
        
        /* For very short screens (landscape mobile or small laptops) */
        @media (max-height: 600px) {
            /* Hide welcome section entirely */
            .arina_prism_sense-welcome-section {
                display: none !important;
            }
            
            /* Hide footer branding, keep only essential form */
            .arina_prism_sense-login-footer {
                display: none !important;
            }
            
            /* Minimal container padding */
            #page-login-index .login-container {
                padding: 12px 16px !important;
                margin: 8px auto !important;
            }
            
            /* Compact form spacing */
            #page-login-index .login-form-username,
            #page-login-index .login-form-password,
            #page-login-index .login-form-submit,
            #page-login-index .login-form-forgotpassword {
                margin-bottom: 10px !important;
            }
            
            /* Smaller inputs */
            #page-login-index input[type="text"],
            #page-login-index input[type="password"] {
                height: 40px !important;
                padding: 0 12px !important;
            }
            
            /* Smaller button */
            #page-login-index #loginbtn {
                height: 40px !important;
                margin-top: 4px !important;
            }
        }
CSS;
}

/**
 * Get login form CSS (labels, inputs, form groups).
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_form_css()
{
    return <<<CSS
        /* ===== LOGIN FORM STYLES ===== */
        
        /* Form Labels - Fluid Responsive */
        #page-login-index label {
            font-size: clamp(13px, 2.5vw, 14px) !important;
            font-weight: 500 !important;
            color: #374151 !important;
            margin-bottom: clamp(4px, 1vh, 6px) !important;
            display: block !important;
        }
        
        /* Modern Input Fields - Fluid Responsive */
        #page-login-index input[type="text"],
        #page-login-index input[type="password"] {
            height: clamp(44px, 8vh, 48px) !important;
            border: 1.5px solid #d1d5db !important;
            border-radius: clamp(6px, 1.5vw, 8px) !important;
            padding: 0 clamp(12px, 3vw, 16px) !important;
            font-size: clamp(14px, 2.8vw, 15px) !important;
            transition: all 0.2s ease !important;
            background: #ffffff !important;
            width: 100% !important;
        }
        
        /* Input Focus State */
        #page-login-index input[type="text"]:focus,
        #page-login-index input[type="password"]:focus {
            outline: none !important;
            border-color: #0f6cbf !important;
            box-shadow: 0 0 0 3px rgba(15, 108, 191, 0.1) !important;
        }
        
        /* Input Hover State */
        #page-login-index input[type="text"]:hover:not(:focus),
        #page-login-index input[type="password"]:hover:not(:focus) {
            border-color: #9ca3af !important;
        }
        
        /* Form Field Container Spacing - Fluid Responsive */
        #page-login-index .login-form-username,
        #page-login-index .login-form-password,
        #page-login-index .login-form-submit,
        #page-login-index .login-form-forgotpassword {
            margin-bottom: clamp(16px, 3vh, 20px) !important;
        }
        
        /* Password wrapper - use relative positioning for absolute button */
        #page-login-index .toggle-sensitive-wrapper {
            position: relative !important;
            display: block !important;
            width: 100% !important;
        }
        
        /* Modern Password Input */
        #page-login-index input#password {
            width: 100% !important;
            padding-right: 50px !important;
        }
        
        /* Password Eye Icon - positioned inside the input - Fluid Responsive */
        #page-login-index .toggle-sensitive-btn {
            position: absolute !important;
            right: clamp(8px, 2vw, 10px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: clamp(32px, 6vw, 36px) !important;
            height: clamp(32px, 6vw, 36px) !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: transparent !important;
            cursor: pointer !important;
            z-index: 10 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #6b7280 !important;
            border-radius: clamp(3px, 1vw, 4px) !important;
            transition: background 0.2s, color 0.2s !important;
        }
        
        #page-login-index .toggle-sensitive-btn:hover {
            background: rgba(0, 0, 0, 0.05) !important;
            color: #374151 !important;
        }
CSS;
}

/**
 * Get login button CSS (primary button, forgot password link).
 *
 * @return string CSS code
 */
function local_arina_prism_sense_get_login_button_css()
{
    return <<<CSS
        /* ===== LOGIN BUTTON STYLES ===== */
        
        /* Modern Login Button - Fluid Responsive */
        #page-login-index #loginbtn {
            height: clamp(44px, 8vh, 48px) !important;
            background: #0f6cbf !important;
            border: none !important;
            border-radius: clamp(6px, 1.5vw, 8px) !important;
            font-size: clamp(14px, 2.8vw, 15px) !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
            margin-top: clamp(6px, 1vh, 8px) !important;
        }
        
        /* Button Hover Effect */
        #page-login-index #loginbtn:hover {
            background: #0d5aa7 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(15, 108, 191, 0.3) !important;
        }
        
        /* Button Active State */
        #page-login-index #loginbtn:active {
            transform: translateY(0) !important;
        }
        
        /* Forgot Password Link - Fluid Responsive */
        #page-login-index .login-form-forgotpassword a {
            color: #0f6cbf !important;
            text-decoration: none !important;
            font-size: clamp(13px, 2.5vw, 14px) !important;
            font-weight: 500 !important;
            transition: color 0.2s ease !important;
        }
        
        #page-login-index .login-form-forgotpassword a:hover {
            color: #0d5aa7 !important;
            text-decoration: underline !important;
        }
CSS;
}


/**
 * Get JavaScript to fix dynamic login page elements.
 * TEMPORARY: For testing purposes only.
 *
 * @return string JavaScript code
 */
function local_arina_prism_sense_get_login_js()
{
    return <<<JS
        // Fix login page elements after DOM loads
        (function() {
            function fixLoginPage() {
                // 1. Hide cookies notice button (button.btn-secondary)
                const buttons = document.querySelectorAll('#page-login-index button.btn-secondary');
                buttons.forEach(function(btn) {
                    if (btn.textContent.includes('Cookies')) {
                        btn.style.display = 'none';
                    }
                });
                
                // 2. Add Welcome Section - use Moodle's actual selectors
                const loginLogo = document.getElementById('loginlogo') || document.querySelector('.login-logo');
                const loginForm = document.querySelector('.loginform');
                
                if (!document.querySelector('.arina_prism_sense-welcome-section')) {
                    const welcomeSection = document.createElement('div');
                    welcomeSection.className = 'arina_prism_sense-welcome-section';
                    welcomeSection.innerHTML = `
                        <h1 class="arina_prism_sense-welcome-title">Start Learning</h1>
                        <p class="arina_prism_sense-welcome-subtitle">Sign in to continue your learning journey</p>
                    `;
                    
                    // Insert after the logo container
                    if (loginLogo) {
                        loginLogo.insertAdjacentElement('afterend', welcomeSection);
                    } else if (loginForm) {
                        // Fallback: insert at beginning of loginform
                        loginForm.insertAdjacentElement('afterbegin', welcomeSection);
                    }
                }
                
                // 3. Add Footer with branding
                const forgetPass = document.querySelector('.login-form-forgotpassword, .forgetpass');
                if (forgetPass && !document.querySelector('.arina_prism_sense-login-footer')) {
                    const footer = document.createElement('div');
                    footer.className = 'arina_prism_sense-login-footer';
                    footer.innerHTML = `
                        <p class="arina_prism_sense-footer-text">Secure learning environment</p>
                        <div class="arina_prism_sense-footer-brand">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Powered by Arina AI
                        </div>
                        <div class="arina_prism_sense-features">
                            <span class="arina_prism_sense-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                AI-Powered
                            </span>
                            <span class="arina_prism_sense-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                Interactive
                            </span>
                            <span class="arina_prism_sense-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                Personalized
                            </span>
                        </div>
                    `;
                    forgetPass.insertAdjacentElement('afterend', footer);
                }
            }
            
            setTimeout(fixLoginPage, 100);
        })();
JS;
}


/**
 * Extend navigation to add Credit Management link.
 * This adds the link to the main navigation which will appear in user menu.
 *
 * @param global_navigation $navigation The navigation object
 */
function local_arina_prism_sense_extend_navigation(global_navigation $navigation)
{
    global $USER, $PAGE;

    // Show for Site Admins and IOMAD Company Managers.
    if (!local_arina_prism_sense_user_can_access_cms()) {
        return;
    }

    // Try to add to user menu
    $usernode = $navigation->find('myprofile', navigation_node::TYPE_USER);
    if ($usernode) {
        $url = new moodle_url('/local/arina_prism_sense/cms.php');
        $node = $usernode->add(
            get_string('creditmanagement', 'local_arina_prism_sense'),
            $url,
            navigation_node::TYPE_SETTING,
            null,
            'creditmanagement',
            new pix_icon('i/dashboard', get_string('creditmanagement', 'local_arina_prism_sense'))
        );
        $node->showinflatnavigation = true;
    }
}

