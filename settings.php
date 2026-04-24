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
 * Settings block for local_arina_prism_sense
 *
 * @package    local_arina_prism_sense
 * @copyright  2024 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig) {
    global $CFG;
    $companySettingsUrl = $CFG->wwwroot . '/local/arina_prism_sense/company_settings.php';

    // Create the settings page inside Site administration > Plugins > Local plugins > PRISM Sense
    $settings = new admin_settingpage(
        'local_arina_prism_sense',
        get_string('settings:pagetitle', 'local_arina_prism_sense')
    );

    // ── Arina Connection ──────────────────────────────────────────────────────
    // Inline registration UI — shown instead of raw org_id / api_key fields.
    // Uses M.cfg.sesskey and M.cfg.wwwroot (set by Moodle core JS) so no PHP
    // session objects are accessed during admin tree building.
    global $SITE, $USER;
    $isRegistered = !empty(get_config('local_arina_prism_sense', 'org_id'));

    // ── Shared HTML fragment constants ────────────────────────────────────────
    define('ARINA_CARD_BODY_OPEN', '<div class="card-body">');
    define('ARINA_CARD_CLOSE', '</div></div>');
    define('ARINA_HIDDEN_STYLE', 'max-width:540px;display:none');

    if ($isRegistered) {
        $connectionHtml =
            '<div class="card border-success mt-2" style="max-width:540px">' .
            ARINA_CARD_BODY_OPEN .
            '<h5 class="card-title text-success mb-1">&#x2705; Connected to Arina</h5>' .
            '<p class="card-text mb-0">This plugin is registered and connected to Arina. ' .
            'Credentials are managed automatically.</p>' .
            ARINA_CARD_CLOSE;
    } else {
        // Check for missing required Moodle fields
        $_ams = [];
        if (empty(trim($SITE->fullname  ?? ''))) { $_ams[] = 'Site full name'; }
        if (empty(trim($SITE->shortname ?? ''))) { $_ams[] = 'Site short name'; }
        $_siteCity    = trim(get_config('moodle', 'city') ?: ($USER->city ?? ''));
        $_siteCountry = trim(get_config('moodle', 'country') ?: ($USER->country ?? ''));
        if (empty($_siteCity)) {
            $_ams[] = 'City (Site administration → Location settings)';
        }
        if (empty($_siteCountry)) {
            $_ams[] = 'Country (Site administration → Location settings)';
        }

        $_adminEmail = htmlspecialchars($USER->email    ?? '', ENT_QUOTES);
        $_orgName    = htmlspecialchars($SITE->fullname ?? '', ENT_QUOTES);

        $connectionHtml = '<div id="arina-reg-root" data-admin-email="' . $_adminEmail . '">';

        if (!empty($_ams)) {
            // Missing fields — show error, no Register button
            $_liHtml = '';
            foreach ($_ams as $_item) {
                $_liHtml .= '<li>' . htmlspecialchars($_item, ENT_QUOTES) . '</li>';
            }
            $connectionHtml .=
                '<div class="alert alert-danger mt-2" style="max-width:540px">' .
                'Your Moodle site is missing required information. Please update the following before registering:' .
                '<ul>' . $_liHtml . '</ul></div>';
        } else {
            // Ready to register card
            $connectionHtml .=
                '<div id="arina-reg-ready" class="card mt-2" style="max-width:540px">' .
                ARINA_CARD_BODY_OPEN .
                '<h5 class="card-title mb-3">Register with Arina</h5>' .
                '<dl class="row mb-3">' .
                '<dt class="col-sm-4">Organisation</dt><dd class="col-sm-8">' . $_orgName . '</dd>' .
                '<dt class="col-sm-4">Admin email</dt><dd class="col-sm-8">' . $_adminEmail . '</dd>' .
                '</dl>' .
                '<p class="text-muted small mb-3">A verification email will be sent to <strong>' .
                $_adminEmail . '</strong>. Keep this page open until registration is complete.</p>' .
                '<button id="arina-register-btn" class="btn btn-primary" type="button">Register with Arina</button>' .
                ARINA_CARD_CLOSE;
        }

        // Pending UI (hidden; shown by JS after clicking Register)
        $connectionHtml .=
            '<div id="arina-pending-ui" class="card mt-2" style="' . ARINA_HIDDEN_STYLE . '">' .
            '<div class="card-body text-center py-4">' .
            '<div class="spinner-border text-primary mb-3" role="status"></div>' .
            '<p id="arina-status-text" class="mb-1 fw-bold"></p>' .
            '<p id="arina-step-text" class="text-muted small mb-3"></p>' .
            '<button id="arina-resend-btn" class="btn btn-outline-secondary btn-sm me-2"' .
            ' type="button" disabled>Resend Email (60s)</button>' .
            '<a id="arina-startover-link" href="#" class="btn btn-link btn-sm text-muted">Start Over</a>' .
            ARINA_CARD_CLOSE;

        // Success UI (hidden; shown by JS on complete)
        $connectionHtml .=
            '<div id="arina-success-ui" class="card mt-2 border-success" style="' . ARINA_HIDDEN_STYLE . '">' .
            ARINA_CARD_BODY_OPEN .
            '<h5 class="card-title text-success">&#x2705; Registration complete!</h5>' .
            '<p class="card-text">Your plugin is now connected to Arina. ' .
            '<a href="' . htmlspecialchars(
                $CFG->wwwroot . '/admin/settings.php?section=local_arina_prism_sense',
                ENT_QUOTES
            ) . '">Refresh this page</a> to confirm.</p>' .
            ARINA_CARD_CLOSE;

        // Error UI (hidden; shown by JS on failure)
        $connectionHtml .=
            '<div id="arina-error-ui" class="card mt-2 border-danger" style="' . ARINA_HIDDEN_STYLE . '">' .
            ARINA_CARD_BODY_OPEN .
            '<h5 class="card-title text-danger">Registration failed</h5>' .
            '<p id="arina-error-message" class="card-text text-danger"></p>' .
            '<button class="btn btn-outline-danger mt-2"' .
            ' type="button" onclick="window.location.reload()">Try Again</button>' .
            ARINA_CARD_CLOSE;

        $connectionHtml .= '</div>'; // end #arina-reg-root

        // JS — uses M.cfg.sesskey and M.cfg.wwwroot injected by Moodle core.
        // Admin email is read from the data-admin-email attribute (no PHP session calls here).
        $connectionHtml .= <<<'JSCRIPT'
<script>
(function () {
    'use strict';
    if (typeof M === 'undefined' || !M.cfg) { return; }

    var POLL_INTERVAL   = 5000;
    var RESEND_COOLDOWN = 60;
    var SESSKEY     = M.cfg.sesskey;
    var AJAX_URL    = M.cfg.wwwroot + '/local/arina_prism_sense/register.php';
    var root        = document.getElementById('arina-reg-root');
    var ADMIN_EMAIL = root ? root.getAttribute('data-admin-email') : '';

    var STATUS_LABELS = {
        'pending_verification': 'Waiting for email verification\u2026',
        'email_verified':       'Email verified! Setting up your organisation\u2026',
        'creating_org':         'Creating organisation\u2026',
        'creating_manager':     'Setting up manager account\u2026',
        'registering_auth':     'Registering authentication\u2026',
        'generating_api_key':   'Generating API key\u2026',
        'provisioning_wallet':  'Provisioning credit wallet\u2026',
        'complete':             'Registration complete!',
        'failed':               'Registration failed.'
    };

    var pollTimer     = null;
    var resendTimer   = null;
    var readyCard     = document.getElementById('arina-reg-ready');
    var registerBtn   = document.getElementById('arina-register-btn');
    var pendingUI     = document.getElementById('arina-pending-ui');
    var successUI     = document.getElementById('arina-success-ui');
    var errorUI       = document.getElementById('arina-error-ui');
    var statusText    = document.getElementById('arina-status-text');
    var stepText      = document.getElementById('arina-step-text');
    var resendBtn     = document.getElementById('arina-resend-btn');
    var startoverLink = document.getElementById('arina-startover-link');
    var errorMessage  = document.getElementById('arina-error-message');

    function buildUrl(action) {
        return AJAX_URL + '?action=' + encodeURIComponent(action) +
               '&sesskey=' + encodeURIComponent(SESSKEY);
    }

    function postAction(action, body) {
        return fetch(buildUrl(action), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body || {})
        }).then(function (r) { return r.json(); });
    }

    function showPendingUI() {
        if (readyCard) { readyCard.style.display = 'none'; }
        pendingUI.style.display = '';
        successUI.style.display = 'none';
        errorUI.style.display   = 'none';
        statusText.textContent  = STATUS_LABELS['pending_verification'];
        stepText.textContent    = '';
    }

    function showSuccessUI() {
        pendingUI.style.display = 'none';
        successUI.style.display = '';
    }

    function showErrorUI(message) {
        pendingUI.style.display  = 'none';
        errorUI.style.display    = '';
        errorMessage.textContent = message || 'An unexpected error occurred.';
    }

    function updateStatusText(status, step, totalSteps) {
        statusText.textContent = STATUS_LABELS[status] || status;
        stepText.textContent   = (step && totalSteps) ? ('Step ' + step + ' of ' + totalSteps) : '';
    }

    function startPolling(sessionId) {
        if (pollTimer) { clearInterval(pollTimer); }
        pollTimer = setInterval(function () {
            postAction('poll_status', { session_id: sessionId })
                .then(function (res) {
                    if (res.status === 'complete') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showSuccessUI();
                    } else if (res.status === 'failed') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showErrorUI(res.message);
                    } else if (res.status === 'expired') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showErrorUI('Session expired. Please register again.');
                    } else {
                        updateStatusText(res.status, res.step, res.total_steps);
                    }
                })
                .catch(function () {});
        }, POLL_INTERVAL);
    }

    function startResendTimer() {
        if (resendTimer) { clearInterval(resendTimer); }
        var seconds = RESEND_COOLDOWN;
        resendBtn.disabled    = true;
        resendBtn.textContent = 'Resend Email (' + seconds + 's)';
        resendTimer = setInterval(function () {
            seconds--;
            if (seconds <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled    = false;
                resendBtn.textContent = 'Resend Email';
            } else {
                resendBtn.textContent = 'Resend Email (' + seconds + 's)';
            }
        }, 1000);
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', function () {
            registerBtn.disabled    = true;
            registerBtn.textContent = 'Starting\u2026';
            postAction('start_registration', {}).then(function (res) {
                if (res.success) {
                    localStorage.setItem('arina_reg_session_id', res.session_id);
                    showPendingUI();
                    startPolling(res.session_id);
                    startResendTimer();
                } else {
                    registerBtn.disabled    = false;
                    registerBtn.textContent = 'Register with Arina';
                    alert(res.message || res.error || 'Failed to start registration.');
                }
            });
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', function () {
            postAction('resend_email', { email: ADMIN_EMAIL }).then(function (res) {
                if (res.error === 'expired') {
                    if (pollTimer) { clearInterval(pollTimer); }
                    localStorage.removeItem('arina_reg_session_id');
                    showErrorUI('Session expired. Please register again.');
                    return;
                }
                if (res.error === 'already_registered') {
                    showErrorUI('This account is already registered. Please contact support.');
                    return;
                }
                var toast = document.createElement('div');
                toast.className   = 'alert alert-success mt-2 py-1 px-2 small';
                toast.textContent = 'Verification email resent!';
                pendingUI.querySelector('.card-body').appendChild(toast);
                setTimeout(function () { toast.remove(); }, 3000);
                startResendTimer();
            });
        });
    }

    if (startoverLink) {
        startoverLink.addEventListener('click', function (e) {
            e.preventDefault();
            if (pollTimer)   { clearInterval(pollTimer); }
            if (resendTimer) { clearInterval(resendTimer); }
            localStorage.removeItem('arina_reg_session_id');
            window.location.reload();
        });
    }

    // Resume in-progress session if page was refreshed mid-registration
    var savedSessionId = localStorage.getItem('arina_reg_session_id');
    if (savedSessionId) {
        showPendingUI();
        startPolling(savedSessionId);
        startResendTimer();
    }
}());
</script>
JSCRIPT;
    }

    $settings->add(new admin_setting_heading(
        'local_arina_prism_sense/arina_connection',
        'Arina Connection',
        $connectionHtml
    ));

    // Link to per-company settings (only shown when IOMAD is installed).
    if (\core_plugin_manager::instance()->get_plugin_info('local_iomad') !== null) {
        $settings->add(new admin_setting_heading(
            'local_arina_prism_sense/iomad_heading',
            get_string('settings:iomad_heading', 'local_arina_prism_sense'),
            '<a href="' . $companySettingsUrl . '" class="btn btn-secondary btn-sm">' .
            get_string('settings:iomad_link', 'local_arina_prism_sense') . '</a>'
        ));
    }

    $ADMIN->add('localplugins', $settings);

    // Register the registration page so admin_externalpage_setup() resolves correctly.
    $ADMIN->add(
        'localplugins',
        new admin_externalpage(
            'local_arina_prism_sense_register',
            get_string('settings:register_heading', 'local_arina_prism_sense'),
            $CFG->wwwroot . '/local/arina_prism_sense/register.php',
            'moodle/site:config',
            true // Hide from the left menu tree
        )
    );
}
