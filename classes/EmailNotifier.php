<?php
/**
 * Email notification helper for local_lecturebot
 *
 * Sends transactional emails to users when content generation or PDF document
 * processing completes or fails. Uses Moodle's email_to_user() so that the
 * fully self-contained HTML templates are delivered exactly as designed,
 * without Moodle's site-shell wrapping.
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_lecturebot;

defined('MOODLE_INTERNAL') || die();

/**
 * Static helper for sending email notifications.
 */
class EmailNotifier
{
    /** Support URL shown in email footers. */
    private const SUPPORT_URL = 'https://arina.ai/support';

    /** Moodle course dashboard path (appended to $CFG->wwwroot). */
    private const DASHBOARD_PATH = '/course/view.php?id=';

    /** Date format used in email metadata cells. */
    private const DATE_FORMAT = 'Y-m-d H:i T';

    // Template token keys — defined once to avoid duplicated string literals.
    private const TOKEN_LOGO          = '{{ logo_embedded }}';
    private const TOKEN_PROCESS_NAME  = '{{ process_name }}';
    private const TOKEN_REQ_ID        = '{{ req_id }}';
    private const TOKEN_USER_ID       = '{{ user_id }}';
    private const TOKEN_SUPPORT_URL   = "{{ support_url | default('#') }}";
    private const TOKEN_UNSUBSCRIBE   = "{{ unsubscribe_url | default('#') }}";

    // Shared error_log message fragments.
    private const LOG_INVALID_EMAIL   = 'LectureBot EmailNotifier: invalid email \'';
    private const LOG_FOR_USER        = '\' for user ';
    private const LOG_CANNOT_RESOLVE  = 'LectureBot EmailNotifier: cannot resolve user for content ';

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Send a "generation completed" email to the user who triggered the job.
     *
     * @param  object $content  DB record from local_lecturebot_content
     */
    public static function sendContentSuccess($content): void
    {
        $ctx = self::resolveContentContext($content);
        if ($ctx === null) {
            return;
        }
        [$user, $processName, $dashboardUrl] = $ctx;

        $userId = htmlspecialchars(
            (string) ($content->userid ?? $content->createdby ?? ''),
            ENT_QUOTES,
            'UTF-8'
        );
        $tokens = [
            self::TOKEN_LOGO         => self::logoUrl(),
            self::TOKEN_PROCESS_NAME => htmlspecialchars($processName, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_REQ_ID       => htmlspecialchars($content->request_id ?? 'N/A', ENT_QUOTES, 'UTF-8'),
            self::TOKEN_USER_ID      => $userId,
            '{{ completed_at }}'     => date(self::DATE_FORMAT),
            "{{ dashboard_url | default('#') }}" => htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_UNSUBSCRIBE  => '#',
            self::TOKEN_SUPPORT_URL  => self::SUPPORT_URL,
        ];

        $html = self::renderTemplate('tutorial_generation_success.html', $tokens);
        if ($html === null) {
            return;
        }

        $subject = $processName . ' – Generation Completed';
        $plaintext = "Hi {$user->firstname},\n\n"
            . "Your {$processName} has been generated successfully.\n\n"
            . "View it at: {$dashboardUrl}\n\n— Arina AI";

        self::send($user, $subject, $plaintext, $html);
    }

    /**
     * Send a "generation failed" email to the user who triggered the job.
     *
     * @param  object $content       DB record from local_lecturebot_content
     * @param  string $errorMessage  Human-readable error reason
     */
    public static function sendContentFailure($content, string $errorMessage): void
    {
        $ctx = self::resolveContentContext($content);
        if ($ctx === null) {
            return;
        }
        [$user, $processName, $dashboardUrl] = $ctx;

        // Translate the sentinel into a user-friendly message.
        // This is the ONLY text shown in the email; the raw $errorMessage is discarded.
        $userFriendlyError = self::sentinelToEmailMessage($errorMessage);

        // Build the conditional error-details box so we don't need Jinja2 {% if %} support.
        $safeError = htmlspecialchars($userFriendlyError, ENT_QUOTES, 'UTF-8');
        $errorBox  = $userFriendlyError ? self::buildErrorBox($safeError, 'Error Details') : '';

        // Replace the Jinja2 conditional block with our pre-built HTML.
        $userIdF = htmlspecialchars(
            (string) ($content->userid ?? $content->createdby ?? ''),
            ENT_QUOTES,
            'UTF-8'
        );
        $reqIdF = htmlspecialchars($content->request_id ?? 'N/A', ENT_QUOTES, 'UTF-8');
        $templateTokens = [
            self::TOKEN_LOGO         => self::logoUrl(),
            self::TOKEN_PROCESS_NAME => htmlspecialchars($processName, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_REQ_ID       => $reqIdF,
            self::TOKEN_USER_ID      => $userIdF,
            '{{ failed_at }}'        => date(self::DATE_FORMAT),
            '{{ error_message }}'    => $safeError,
            "{{ retry_url | default('#') }}"  => htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_SUPPORT_URL  => self::SUPPORT_URL,
            self::TOKEN_UNSUBSCRIBE  => '#',
        ];

        $html = self::renderTemplate('tutorial_generation_failure.html', $templateTokens);
        if ($html === null) {
            return;
        }

        // Replace the entire {% if error_message %}...{% endif %} Jinja2 block.
        $html = preg_replace(
            '/\{%\s*if\s+error_message\s*%\}.*?\{%\s*endif\s*%\}/s',
            $errorBox,
            $html
        );

        $subject   = $processName . ' – Generation Failed';
        $plaintext = "Hi {$user->firstname},\n\n"
            . "Unfortunately your {$processName} failed to generate.\n\n"
            . "Reason: {$userFriendlyError}\n\n"
            . "Please retry from your dashboard: {$dashboardUrl}\n\n— Arina AI";

        self::send($user, $subject, $plaintext, $html);
    }

    /**
     * Send a "PDF processing completed" email.
     * The recipient is looked up from Moodle's files table (the person who uploaded the PDF).
     *
     * @param  object $source  DB record from local_lecturebot_sources
     * @param  object $user    Moodle user object (already resolved by caller)
     */
    public static function sendSourceSuccess($source, $user): void
    {
        global $CFG;

        if (!self::isValidEmail($user->email)) {
            error_log(self::LOG_INVALID_EMAIL . $user->email
                . self::LOG_FOR_USER . $user->id . ', skipping source success email.');
            return;
        }

        $filename     = $source->title ?: $source->filename;
        $dashboardUrl = $CFG->wwwroot . self::DASHBOARD_PATH . $source->courseid;

        $reqIdSS = htmlspecialchars(
            $source->upload_id ?? $source->batch_id ?? 'N/A',
            ENT_QUOTES,
            'UTF-8'
        );
        $tokens = [
            self::TOKEN_LOGO         => self::logoUrl(),
            self::TOKEN_PROCESS_NAME => 'PDF Processing',
            self::TOKEN_REQ_ID       => $reqIdSS,
            self::TOKEN_USER_ID      => htmlspecialchars((string) $user->id, ENT_QUOTES, 'UTF-8'),
            '{{ completed_at }}'     => date(self::DATE_FORMAT),
            "{{ dashboard_url | default('#') }}" => htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_UNSUBSCRIBE  => '#',
            self::TOKEN_SUPPORT_URL  => self::SUPPORT_URL,
        ];

        $html = self::renderTemplate('tutorial_generation_success.html', $tokens);
        if ($html === null) {
            return;
        }

        // Replace process_name in the greeting paragraph too (it's in HTML too).
        $safeFile = htmlspecialchars($filename, ENT_QUOTES, 'UTF-8');
        $html = str_replace(
            'Great news — your <strong style="color:#0f172a; font-weight:600;">'.
                'PDF Processing</strong> has finished successfully.',
            'Great news — your file <strong style="color:#0f172a; font-weight:600;">'.
                "{$safeFile}</strong> has been processed and is ready to use.",
            $html
        );

        $subject   = 'PDF Processing Completed – ' . $filename;
        $plaintext = "Hi {$user->firstname},\n\n"
            . "Your PDF \"{$filename}\" has been processed successfully.\n\n"
            . "View your course: {$dashboardUrl}\n\n— Arina AI";

        self::send($user, $subject, $plaintext, $html);
    }

    /**
     * Send a "PDF processing failed" email.
     *
     * @param  object $source  DB record from local_lecturebot_sources
     * @param  object $user    Moodle user object (already resolved by caller)
     */
    public static function sendSourceFailure($source, $user): void
    {
        global $CFG;

        if (!self::isValidEmail($user->email)) {
            error_log(self::LOG_INVALID_EMAIL . $user->email
                . self::LOG_FOR_USER . $user->id . ', skipping source failure email.');
            return;
        }

        $filename     = $source->title ?: $source->filename;
        $dashboardUrl = $CFG->wwwroot . self::DASHBOARD_PATH . $source->courseid;

        $safeFile  = htmlspecialchars($filename, ENT_QUOTES, 'UTF-8');
        $errorBox  = self::buildErrorBox($safeFile, 'File');

        $reqIdSF = htmlspecialchars(
            $source->upload_id ?? $source->batch_id ?? 'N/A',
            ENT_QUOTES,
            'UTF-8'
        );
        $tokens = [
            self::TOKEN_LOGO         => self::logoUrl(),
            self::TOKEN_PROCESS_NAME => 'PDF Processing',
            self::TOKEN_REQ_ID       => $reqIdSF,
            self::TOKEN_USER_ID      => htmlspecialchars((string) $user->id, ENT_QUOTES, 'UTF-8'),
            '{{ failed_at }}'        => date(self::DATE_FORMAT),
            '{{ error_message }}'    => $safeFile,
            "{{ retry_url | default('#') }}" => htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8'),
            self::TOKEN_SUPPORT_URL  => self::SUPPORT_URL,
            self::TOKEN_UNSUBSCRIBE  => '#',
        ];

        $html = self::renderTemplate('tutorial_generation_failure.html', $tokens);
        if ($html === null) {
            return;
        }

        // Replace the Jinja2 conditional block with the pre-built error box.
        $html = preg_replace(
            '/\{%\s*if\s+error_message\s*%\}.*?\{%\s*endif\s*%\}/s',
            $errorBox,
            $html
        );

        $subject   = 'PDF Processing Failed – ' . $filename;
        $plaintext = "Hi {$user->firstname},\n\n"
            . "Unfortunately the file \"{$filename}\" could not be processed.\n\n"
            . "Please re-upload it from your course: {$dashboardUrl}\n\n— Arina AI";

        self::send($user, $subject, $plaintext, $html);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Translate a sentinel error code into a user-friendly sentence for emails.
     *
     * This is the ONLY text shown to the user in failure emails; raw backend
     * errors are never passed through to the email content.
     *
     * @param  string $sentinel  One of the sentinel codes, or any raw string
     * @return string            Human-readable explanation of the failure
     */
    private static function sentinelToEmailMessage(string $sentinel): string
    {
        $map = [
            'PDF_UPLOAD_FAILED'    => 'Generation failed due to a PDF upload failure. '
                . 'Please delete and re-upload your PDFs, then try again.',
            'CURRICULUM_MISMATCH'  => 'Generation failed due to a mismatch in the curriculum. '
                . 'Please review your curriculum settings and try again.',
            'INSUFFICIENT_CREDITS' => 'Video generation failed due to insufficient credits. '
                . 'Please contact your administrator to top up your account.',
            'VIDEO_FAILED'         => 'Video generation failed. Please try again.',
        ];

        return $map[$sentinel]
            ?? 'Content generation failed. Please try again from your dashboard.';
    }

    /**
     * Build the error/file details box used in failure email templates.
     * Centralised to eliminate duplicated HTML and CSS style strings.
     *
     * @param  string $safeContent  Already-escaped content string
     * @param  string $label        Label text (e.g. 'Error Details' or 'File')
     * @return string               Ready-to-embed HTML table string
     */
    private static function buildErrorBox(string $safeContent, string $label): string
    {
        $tdStyle   = 'background:#fff8f8; border:1px solid #fecdd3;'
            . ' border-left:3px solid #ef4444; border-radius:8px; padding:14px 16px;';
        $spanLabel = 'font-size:10px; font-weight:600; color:#ef4444; text-transform:uppercase;'
            . ' letter-spacing:0.7px; display:block; margin-bottom:6px; font-family:Arial,sans-serif;';
        $spanBody  = 'font-size:12.5px; color:#7f1d1d; line-height:1.6;'
            . " font-family:'Courier New',Courier,monospace; display:block; word-break:break-word;";
        return '<table cellpadding="0" cellspacing="0" border="0" role="presentation"'
            . ' style="width:100%; margin-bottom:20px;">'
            . "<tr><td style=\"{$tdStyle}\">"
            . "<span style=\"{$spanLabel}\">{$label}</span>"
            . "<span style=\"{$spanBody}\">{$safeContent}</span>"
            . '</td></tr></table>';
    }

    /**
     * Resolve + validate the user for a content-type email, and compute shared context.
     * Returns [user, processName, dashboardUrl] on success, or null if the email
     * cannot be sent (user not found or invalid email — already logged internally).
     *
     * @param  object    $content  DB record from local_lecturebot_content
     * @return array|null          [object $user, string $processName, string $dashboardUrl]
     */
    private static function resolveContentContext($content): ?array
    {
        global $CFG;

        $user = self::resolveUser((int) ($content->userid ?? $content->createdby ?? 0));
        if (!$user) {
            error_log(self::LOG_CANNOT_RESOLVE . $content->id . ', skipping email.');
            return null;
        }

        if (!self::isValidEmail($user->email)) {
            error_log(self::LOG_INVALID_EMAIL . $user->email . self::LOG_FOR_USER . $user->id . ', skipping.');
            return null;
        }

        $processName  = self::formatContentType($content->contenttype ?? 'Content');
        $dashboardUrl = $CFG->wwwroot . self::DASHBOARD_PATH . ($content->courseid ?? '');

        return [$user, $processName, $dashboardUrl];
    }

    /**
     * Load a template file and substitute {{ token }} placeholders.
     *
     * @param  string   $templateName  Filename inside email_templates/
     * @param  string[] $tokens        Map of placeholder → replacement string
     * @return string|null             Rendered HTML, or null on failure
     */
    private static function renderTemplate(string $templateName, array $tokens): ?string
    {
        $path = __DIR__ . '/../email_templates/' . $templateName;

        if (!file_exists($path)) {
            error_log("LectureBot EmailNotifier: template not found: {$path}");
            return null;
        }

        $html = file_get_contents($path);
        if ($html === false) {
            error_log("LectureBot EmailNotifier: failed to read template: {$path}");
            return null;
        }

        return str_replace(array_keys($tokens), array_values($tokens), $html);
    }

    /**
     * Look up a Moodle user record by ID.
     *
     * @param  int          $userid
     * @return object|null  Full user record, or null if not found / userid is 0
     */
    private static function resolveUser(int $userid): ?object
    {
        global $DB;

        if ($userid <= 0) {
            return null;
        }

        $user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0], '*', IGNORE_MISSING);
        return $user ?: null;
    }

    /**
     * Shallow email format validation — rejects obviously invalid addresses.
     * Does NOT check if the mailbox actually exists (that's the user's responsibility).
     *
     * @param  string $email
     * @return bool
     */
    private static function isValidEmail(string $email): bool
    {
        return !empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Send the email via Moodle's email_to_user().
     * Failures are caught and logged — they must never propagate to callers.
     */
    private static function send(object $user, string $subject, string $plaintext, string $html): void
    {
        try {
            $noreply = \core_user::get_noreply_user();
            $result  = email_to_user($user, $noreply, $subject, $plaintext, $html);

            if ($result) {
                error_log("LectureBot EmailNotifier: email sent to {$user->email} — {$subject}");
            } else {
                error_log('LectureBot EmailNotifier: email_to_user returned false for '
                    . $user->email . ' — ' . $subject);
            }
        } catch (\Throwable $e) {
            error_log("LectureBot EmailNotifier: exception sending to {$user->email}: " . $e->getMessage());
        }
    }

    /**
     * Returns the Arina AI logo URL for use in {{ logo_embedded }}.
     * Falls back gracefully if the plugin image file isn't found.
     */
    private static function logoUrl(): string
    {
        global $CFG;
        // Use Moodle's pix directory for the plugin logo if available.
        return $CFG->wwwroot . '/local/lecturebot/pix/icon.png';
    }

    /**
     * Convert a content type slug into a human-friendly label.
     * e.g. "slide-deck" → "Slide Deck", "flashcards" → "Flashcards"
     */
    private static function formatContentType(string $contentType): string
    {
        $map = [
            'slide-deck'  => 'Slide Deck',
            'flashcards'  => 'Flashcards',
            'mind-map'    => 'Mind Map',
            'video'       => 'Video Lecture',
            'quiz'        => 'Quiz',
            'summary'     => 'Summary',
        ];

        return $map[$contentType] ?? ucwords(str_replace(['-', '_'], ' ', $contentType));
    }
}
