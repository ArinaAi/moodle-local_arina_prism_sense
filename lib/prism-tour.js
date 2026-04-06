/**
 * PRISM Sense — Shared Guided Tour Engine
 *
 * Each PHP entry point (launch.php, student_view.php, cms.php) sets
 * window.PRISM_TOUR_CONFIG before loading this file.  This script reads
 * that config, waits for the React app to mount, then auto-starts the
 * Shepherd.js tour.
 *
 * Config shape:
 * {
 *   shepherdJs  : '<wwwroot>/local/lecturebot/js/shepherd-tour.min.js',
 *   markSeenUrl : '<wwwroot>/local/lecturebot/api/mark_tour_seen.php',
 *   sesskey     : '<moodle_sesskey>',
 *   prefKey     : 'lecturebot_tour_XXX_seen',
 *   steps       : [ { id, title, text, attachTo?, buttons? }, … ],
 *   pollFor     : ['#css-selector-1', '#css-selector-2'],
 * }
 *
 * The global window.startLecturebotTour() is also exported for manual
 * re-triggering (e.g. from a Help menu).
 *
 * @package   local_lecturebot
 * @copyright 2026 Arina AI <info@arina.ai>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
(function () {
    'use strict';

    var cfg = window.PRISM_TOUR_CONFIG;
    if (!cfg || !cfg.shepherdJs || !cfg.prefKey || !cfg.steps) {
        return; // Guard: PHP gate should prevent this, but be safe.
    }

    // ── Styles ────────────────────────────────────────────────────────────────

    function injectStyles() {
        var styleId = 'shepherd-theme-prism';
        if (document.getElementById(styleId)) { return; }
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
            // Entry animation
            '@keyframes prism-tour-in{from{opacity:0;transform:translateY(8px)}' +
            'to{opacity:1;transform:translateY(0)}}',
            // Card
            '.shepherd-element{max-width:400px;z-index:100001!important;border-radius:14px!important;',
            'box-shadow:0 8px 32px rgba(0,0,0,0.18)!important;' +
            'animation:prism-tour-in .22s ease-out!important}',
            // Inner clip (keeps corners rounded without clipping the arrow)
            '.shepherd-content{border-radius:14px!important;overflow:hidden!important}',
            // Arrow — no diamond artifact
            '.shepherd-arrow::before{transform:none!important}',
            // Push arrow out from card edge
            '.shepherd-element[data-popper-placement^=right]>.shepherd-arrow' +
            '{margin-left:-6px!important}',
            '.shepherd-element[data-popper-placement^=left]>.shepherd-arrow' +
            '{margin-right:-6px!important}',
            '.shepherd-element[data-popper-placement^=bottom]>.shepherd-arrow' +
            '{margin-top:-6px!important}',
            '.shepherd-element[data-popper-placement^=top]>.shepherd-arrow' +
            '{margin-bottom:-6px!important}',
            // Arrow triangles
            '.shepherd-element[data-popper-placement^=right]>.shepherd-arrow::before{' +
            'clip-path:polygon(0 50%,100% 0,100% 100%)!important;' +
            'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
            '.shepherd-element[data-popper-placement^=left]>.shepherd-arrow::before{' +
            'clip-path:polygon(100% 50%,0 0,0 100%)!important;' +
            'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
            '.shepherd-element[data-popper-placement^=bottom]>.shepherd-arrow::before{' +
            'clip-path:polygon(50% 0,0 100%,100% 100%)!important;' +
            'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
            '.shepherd-element[data-popper-placement^=top]>.shepherd-arrow::before{' +
            'clip-path:polygon(50% 100%,0 0,100% 0)!important;' +
            'background:#0a5a9d!important}',
            // Header
            '.shepherd-header{background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important;',
            'border-radius:0!important;padding:14px 18px!important;align-items:center}',
            '.shepherd-title{color:#fff!important;font-weight:700!important;' +
            'font-size:.975rem!important;flex:1}',
            '.shepherd-cancel-icon{color:rgba(255,255,255,.75)!important;' +
            'font-size:1.1rem!important}',
            '.shepherd-cancel-icon:hover{color:#fff!important}',
            // Progress counter badge
            '.prism-step-counter{font-size:.72rem;font-weight:500;' +
            'color:rgba(255,255,255,.7);background:rgba(255,255,255,.15);' +
            'border-radius:20px;padding:2px 9px;margin-right:8px;white-space:nowrap}',
            // Body
            '.shepherd-text{font-size:.895rem;line-height:1.6;color:#1f2937;' +
            'padding:18px 20px 12px}',
            // Footer
            '.shepherd-footer{padding:4px 16px 16px;gap:8px;border-top:none}',
            // Primary button
            '.shepherd-button-primary{background:linear-gradient(' +
            '135deg,#0f6cbf 0%,#0a5a9d 100%)!important;border-radius:20px!important;' +
            'font-weight:600!important;padding:8px 20px!important;' +
            'color:#fff!important;transition:opacity .15s}',
            '.shepherd-button-primary:hover{opacity:.88!important}',
            // Arrow on Next buttons only
            '.shepherd-button-primary.prism-btn-next::after{content:" →"}',
            // Secondary button
            '.shepherd-button-secondary{border:1px solid #d1d5db!important;' +
            'border-radius:20px!important;font-weight:500!important;' +
            'padding:8px 20px!important;color:#374151!important;' +
            'background:#fff!important}',
            '.shepherd-button-secondary:hover{background:#f3f4f6!important}',
            // Target highlight
            '.prism-tour-active{outline:2.5px solid #0f6cbf!important;' +
            'outline-offset:4px!important;border-radius:6px!important;' +
            'transition:outline .15s ease}'
        ].join('');
        document.head.appendChild(style);
    }

    // ── Shepherd loader ───────────────────────────────────────────────────────

    function loadShepherd(callback) {
        if (window.Shepherd) { callback(); return; }
        injectStyles();
        var script = document.createElement('script');
        script.src = cfg.shepherdJs;
        script.onload = callback;
        script.onerror = function () {
            console.warn('[PRISM Tour] Could not load Shepherd.js from ' + cfg.shepherdJs);
        };
        document.head.appendChild(script);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns an attachTo object only when the target element is in the DOM
     * AND has a visible layout box (not CSS display:none or zero-size).
     * On mobile some anchors are CSS-hidden (e.g. CMS balance row on xs) —
     * returning undefined lets Shepherd float the step centred instead of
     * trying to position against an invisible zero-size element.
     */
    function attachTo(selector, side) {
        var el = document.querySelector(selector);
        if (!el) { return undefined; }
        // offsetParent is null for display:none elements (and position:fixed,
        // but those are valid Shepherd targets so we fall back to boundingRect).
        var rect = el.getBoundingClientRect();
        var hasSize = rect.width > 0 || rect.height > 0;
        if (!hasSize) { return undefined; } // CSS-hidden on this viewport
        return { element: selector, on: side };
    }

    function clearHighlight() {
        var prev = document.querySelector('.prism-tour-active');
        if (prev) { prev.classList.remove('prism-tour-active'); }
    }

    /** Injects / updates the "Step X of N" counter in the Shepherd header. */
    function updateProgress(tour, step) {
        var current = tour.steps.indexOf(step) + 1;
        var total   = tour.steps.length;
        var old = document.querySelector('.prism-step-counter');
        if (old) { old.remove(); }
        var titleEl = document.querySelector('.shepherd-title');
        if (titleEl) {
            var badge = document.createElement('span');
            badge.className   = 'prism-step-counter';
            badge.textContent = current + ' / ' + total;
            titleEl.parentNode.insertBefore(badge, titleEl);
        }
    }

    // ── Mark seen ─────────────────────────────────────────────────────────────

    /**
     * Persists the tour-seen state to Moodle user preferences (server-side).
     * localStorage is unreliable in Moodle — the AMD loader can clear it.
     * Fire-and-forget: failure just means the tour shows once more next visit.
     */
    function markTourSeen() {
        fetch(cfg.markSeenUrl, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
            body    : 'sesskey=' + encodeURIComponent(cfg.sesskey) +
                      '&pref='   + encodeURIComponent(cfg.prefKey)
        }).catch(function () {});
    }

    // ── Tour builder ──────────────────────────────────────────────────────────

    function buildTour() {
        var defaultButtons = [
            {
                text    : 'Skip tour',
                classes : 'shepherd-button-secondary',
                action  : function () { tour.cancel(); }  // eslint-disable-line no-use-before-define
            },
            {
                text    : 'Next',
                classes : 'shepherd-button-primary prism-btn-next',
                action  : function () { tour.next(); }    // eslint-disable-line no-use-before-define
            }
        ];

        var tour = new Shepherd.Tour({
            useModalOverlay    : false,
            defaultStepOptions : {
                cancelIcon : { enabled: true },
                scrollTo   : { behavior: 'smooth', block: 'center' },
                buttons    : defaultButtons,
                when       : {
                    show: function () {
                        var step = this;
                        clearHighlight();
                        var attachCfg = step.options && step.options.attachTo;
                        if (attachCfg && attachCfg.element) {
                            var el = document.querySelector(attachCfg.element);
                            if (el) { el.classList.add('prism-tour-active'); }
                        }
                        updateProgress(tour, step);
                    }
                }
            }
        });

        tour.on('cancel',   function () { clearHighlight(); markTourSeen(); });
        tour.on('complete', function () { clearHighlight(); markTourSeen(); });

        // Build steps from config — resolve attachTo dynamically at step show-time.
        cfg.steps.forEach(function (stepDef, index) {
            var isLast  = index === cfg.steps.length - 1;
            var isFirst = index === 0;

            // Resolve attachTo lazily so we don't query DOM at build time
            // (React may not have mounted yet for later steps).
            var builtStep = {
                id    : stepDef.id,
                title : stepDef.title,
                text  : stepDef.text
            };

            if (stepDef.attachTo) {
                builtStep.attachTo = attachTo(stepDef.attachTo.element, stepDef.attachTo.on);
            }

            // Override buttons for first/last steps or explicit overrides
            if (stepDef.buttons) {
                builtStep.buttons = stepDef.buttons;
            } else if (isFirst) {
                builtStep.buttons = [
                    {
                        text    : 'Skip tour',
                        classes : 'shepherd-button-secondary',
                        action  : function () { tour.cancel(); }
                    },
                    {
                        text    : 'Let\'s go',
                        classes : 'shepherd-button-primary prism-btn-next',
                        action  : function () { tour.next(); }
                    }
                ];
            } else if (isLast) {
                builtStep.buttons = [
                    {
                        text    : 'Done',
                        classes : 'shepherd-button-primary',
                        action  : function () { tour.complete(); }
                    }
                ];
            }

            tour.addStep(builtStep);
        });

        return tour;
    }

    // ── Start tour ────────────────────────────────────────────────────────────

    function startTour() {
        loadShepherd(function () {
            var tour = buildTour();
            // Mark seen immediately on start — popup-close without interaction
            // won't re-fire the tour on the next visit.
            markTourSeen();
            tour.start();
        });
    }

    // Expose for manual re-trigger (e.g. Help menu)
    window.startLecturebotTour = startTour;

    // ── Auto-start: poll until React app anchors are in the DOM ──────────────
    if (cfg.autoStart !== false) {
        var attempts    = 0;
        var maxAttempts = 40; // 40 × 250 ms = 10 s max wait
        var pollFor     = cfg.pollFor || [];

        var interval = setInterval(function () {
            attempts++;
            // Only require the FIRST pollFor selector (always the app header).
            // Subsequent selectors may be absent on mobile viewports (e.g. the
            // student desktop-only content-navigator panel) — those steps will
            // simply float centred via the visibility-aware attachTo() above.
            var ready = pollFor.length === 0 || !!document.querySelector(pollFor[0]);
            if (ready) {
                clearInterval(interval);
                setTimeout(startTour, 800); // Let animations settle first
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 250);
    }

}());
