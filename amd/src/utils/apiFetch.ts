/**
 * apiFetch — a thin wrapper around the native fetch() API.
 *
 * Adds session-expiry detection for all LectureBot API calls.
 * When Moodle detects an expired / invalid session it does one of:
 *   1. Redirects the request to the login page (fetch follows it, returns HTML).
 *   2. Returns HTTP 401 / 403.
 *   3. Returns a JSON Moodle exception with errorcode "requireslogin" or "sessionerror".
 *
 * In all three cases this wrapper throws a `SessionExpiredError`, which the
 * caller does NOT need to handle — a single global listener catches it and
 * redirects the browser to the Moodle login page.
 */

// ─── Custom error type ───────────────────────────────────────────────────────

export class SessionExpiredError extends Error {
    constructor() {
        super('Your session has expired. Redirecting to login…');
        this.name = 'SessionExpiredError';
    }
}

// ─── Global redirect handler ─────────────────────────────────────────────────

let _redirectScheduled = false;

/**
 * Redirect to the Moodle login page exactly once, no matter how many
 * concurrent requests detect the expired session at the same time.
 */
function redirectToLogin(): void {
    if (_redirectScheduled) {
        return;
    }
    _redirectScheduled = true;

    // Derive the login URL from the current page URL.
    // Moodle's login page always lives at <wwwroot>/login/index.php.
    // We read wwwroot from the injected context if available, otherwise
    // fall back to window.location.origin which is always correct for
    // same-origin Moodle installations.
    const wwwroot =
        (window.MOODLE_CONTEXT?.wwwroot) ||
        (window.MOODLE_CMS_CONTEXT?.wwwroot) ||
        window.location.origin;

    const loginUrl = `${wwwroot}/login/index.php`;

    // Give the browser one tick so any in-flight state updates can finish,
    // then hard-navigate so Moodle renders the login form cleanly.
    setTimeout(() => {
        window.location.href = loginUrl;
    }, 0);
}

// ─── Session-expiry signals ───────────────────────────────────────────────────

/**
 * Returns true when the HTTP status alone tells us the session is gone.
 * Moodle AJAX endpoints (AJAX_SCRIPT=true) return:
 *   - 401 / 403 when sesskey validation fails
 */
function isSessionExpiredByStatus(status: number): boolean {
    return status === 401 || status === 403;
}

/**
 * Returns true when the Content-Type header tells us Moodle returned an HTML
 * login-redirect page instead of the JSON we expected.
 */
function isHtmlLoginRedirect(response: Response): boolean {
    const ct = response.headers.get('content-type') ?? '';
    return ct.includes('text/html');
}

/**
 * Returns true when Moodle returned valid JSON but the payload is a Moodle
 * exception indicating the user is not logged in.
 *
 * Moodle AJAX exception shape (AJAX_SCRIPT = true):
 *   { error: string, errorcode: string, stacktrace: null, ... }
 *
 * Real errorcodes observed from this codebase (via curl with no session):
 *   "requireloginerror"  — require_login() / require_login($courseid) when guest
 *   "requireslogin"      — some Moodle core paths
 *   "sessionerror"       — stale session
 *   "invalidsesskey"     — require_sesskey() failure
 */
function isSessionExpiredByBody(body: unknown, httpStatus: number): boolean {
    if (typeof body !== 'object' || body === null) {
        return false;
    }
    const obj = body as Record<string, unknown>;
    const errorcode = (obj['errorcode'] as string | undefined)?.toLowerCase() ?? '';

    // Direct errorcode match — covers all Moodle AJAX session errors
    if (
        errorcode === 'requireloginerror' ||
        errorcode === 'requireslogin' ||
        errorcode === 'sessionerror' ||
        errorcode === 'invalidsesskey' ||
        // Moodle creates a guest session when the real session is missing, then
        // require_login($courseid) fails to find the course record for a guest.
        errorcode === 'invalidrecordunknown'
    ) {
        return true;
    }

    // HTTP 400/500 + our own { success: false } envelope — happens when
    // require_login($courseid) runs with a guest/invalid session and Moodle
    // cannot find the course record. The error message is not reliable but
    // the combination of a non-2xx status + success:false on an internal API
    // endpoint is unambiguously an auth failure in this codebase.
    if ((httpStatus === 400 || httpStatus === 500) && obj['success'] === false) {
        return true;
    }

    return false;
}

// ─── Core wrapper ─────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for `fetch()` that adds session-expiry detection.
 *
 * Usage — identical to fetch():
 *   const response = await apiFetch('/local/lecturebot/api/get_sources.php?…');
 *   const data = await response.json();
 *
 * On session expiry the function throws `SessionExpiredError` AND begins a
 * redirect to the login page. Callers do not need special handling — their
 * existing catch blocks will simply receive this error and can ignore it (the
 * redirect will happen regardless).
 */
export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const response = await fetch(input, init);

    // ── Check 1: HTTP status signals an invalid session ──────────────────────
    if (isSessionExpiredByStatus(response.status)) {
        redirectToLogin();
        throw new SessionExpiredError();
    }

    // ── Check 2: Moodle redirected us to the login page (HTML response) ──────
    // We only check this for our own API endpoints to avoid false-positives on
    // external CDN calls (React, MUI, exchange-rate APIs, etc.).
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isInternalApi = url.includes('/local/lecturebot/api/');

    if (isInternalApi && isHtmlLoginRedirect(response)) {
        redirectToLogin();
        throw new SessionExpiredError();
    }

    // ── Check 3: JSON body contains a Moodle session exception ───────────────
    // We must clone the response because the body stream can only be read once.
    if (isInternalApi) {
        const cloned = response.clone();
        try {
            const body = await cloned.json();
            if (isSessionExpiredByBody(body, response.status)) {
                redirectToLogin();
                throw new SessionExpiredError();
            }
        } catch (e) {
            // If parsing fails it's not a session-error JSON — ignore.
            if (e instanceof SessionExpiredError) {
                throw e;
            }
        }
    }

    return response;
}
