<?php

/**
 * Profile cache trait for CreditServiceClient.
 *
 * Provides cookie-backed caching of Arina user profiles so that the
 * Credit Service API is only called once per browser session.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_arina_prism_sense\cms;

defined('MOODLE_INTERNAL') || die();

/**
 * Cookie-backed profile cache helpers used by CreditServiceClient.
 */
trait ProfileCacheTrait
{
    /**
     * Returns true when running in an HTTP request context (as opposed to CLI/cron).
     * Guards all cookie operations so scheduled tasks are never affected.
     */
    private function isWebContext(): bool
    {
        return !defined('CLI_SCRIPT') && php_sapi_name() !== 'cli';
    }

    /**
     * Build a per-user, per-org cookie key that is opaque to the browser client.
     * Including org_id prevents cross-tenant collisions on shared Moodle instances.
     */
    private function profileCookieKey(int $moodleUserId): string
    {
        $orgId = \local_arina_prism_sense\CompanyConfig::getOrgId() ?? 'default';
        return 'arina_prof_' . hash('sha256', $moodleUserId . '_' . $orgId);
    }

    /**
     * Attempt to read a cached Arina profile from a browser cookie.
     * Returns the decoded profile array, or null when the cookie is absent,
     * corrupt, or fails UUID format validation.
     *
     * @param int $moodleUserId
     * @return array|null { user_id, wallet_id } or null
     */
    private function getProfileFromCookie(int $moodleUserId): ?array
    {
        $key = $this->profileCookieKey($moodleUserId);
        if (empty($_COOKIE[$key])) {
            return null;
        }

        $raw     = base64_decode($_COOKIE[$key], true);
        $profile = ($raw !== false) ? json_decode($raw, true) : null;

        if (!is_array($profile) || !$this->isValidCachedProfile($profile)) {
            return null;
        }

        return $profile;
    }

    /**
     * Validate that a decoded cookie profile has non-empty user_id and wallet_id
     * both conforming to UUID v4 format (guards against tampered cookie values).
     *
     * @param array $profile Decoded profile array
     * @return bool
     */
    private function isValidCachedProfile(array $profile): bool
    {
        if (empty($profile['user_id']) || empty($profile['wallet_id'])) {
            return false;
        }

        // Basic UUID format check to reject tampered/garbage values.
        $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        return (bool) preg_match($uuidPattern, $profile['user_id'])
            && (bool) preg_match($uuidPattern, $profile['wallet_id']);
    }

    /**
     * Store an Arina profile in a browser cookie for 24 hours.
     * Only the user_id and wallet_id are persisted (minimum required payload).
     *
     * Cookie attributes:
     *   HttpOnly  — prevents JS/XSS access to wallet identifiers
     *   SameSite=Strict — blocks CSRF-based cookie leakage
     *   Secure    — HTTPS-only when the current request is over TLS
     *   Path=/    — scoped to the whole Moodle instance
     *
     * @param int   $moodleUserId
     * @param array $profile Must contain user_id and wallet_id.
     */
    private function setProfileCookie(int $moodleUserId, array $profile): void
    {
        $key     = $this->profileCookieKey($moodleUserId);
        $payload = base64_encode(json_encode([
            'user_id'   => $profile['user_id'],
            'wallet_id' => $profile['wallet_id'],
        ]));

        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                 || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);

        setcookie($key, $payload, [
            'expires'  => time() + 86400,   // 24 hours
            'path'     => '/',
            'secure'   => $isSecure,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
}
