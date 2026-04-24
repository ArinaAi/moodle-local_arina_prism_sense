<?php
/**
 * Arina Credit Service API Client
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_arina_prism_sense\cms;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../../config_api.php');

/**
 * Exception thrown when a Credit Service API request fails.
 */
class CreditServiceException extends \Exception
{}

class CreditServiceClient
{
    private $apiKey;
    private $baseUrl;

    public function __construct()
    {
        // Prefer the per-tenant key resolved by CompanyConfig (already bootstrapped
        // by the caller). Falls back to global config_plugins then to the env var
        // so standalone / non-IOMAD installs continue to work unchanged.
        $this->apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey()
            ?? get_config('local_arina_prism_sense', 'api_key')
            ?: getenv('ARINA_PRISM_SENSE_API_KEY');
        $this->baseUrl = CREDIT_SERVICE_URL;
    }

    protected function makeRequest($method, $endpoint, $payload = null)
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');
        $ch = curl_init($url);
        
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];
        if (!empty($this->apiKey)) {
            $headers[] = 'X-Api-key: ' . $this->apiKey;
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new CreditServiceException("CURL Error: $error");
        }

        $decodedData = json_decode($response, true);
        return [
            'status' => $httpCode,
            'data'   => $decodedData
        ];
    }
    
    // Check if Org Wallet exists in Moodle config and create it JIT if missing.
    // Returns the OWNER UUID (not wallet_id) - stored in per-company config (IOMAD)
    // or global config_plugins (standalone). CompanyConfig handles both cases.
    public function getOrInitializeOrgWallet()
    {
        // CompanyConfig::getOrgWalletOwnerId() returns null when bootstrap() hasn't
        // been called yet (self::$resolved is null). Fall back to get_config() so
        // we never generate a fresh UUID just because bootstrap was skipped.
        $uuid = \local_arina_prism_sense\CompanyConfig::getOrgWalletOwnerId()
            ?? get_config('local_arina_prism_sense', 'org_wallet_owner_id');

        if (empty($uuid)) {
            $uuid = $this->generateV4UUID();
            // Persists to local_arina_prism_sense_company_config (IOMAD) or config_plugins
            // (standalone) and updates the in-memory cache automatically.
            \local_arina_prism_sense\CompanyConfig::setOrgWalletOwnerId($uuid);

            // Create in Credit Service
            $this->createWallet($uuid, 'ORGANIZATION');
        }
        return $uuid;
    }
    
    /**
     * Register a Moodle user in Arina (idempotent). On first registration (HTTP 200)
     * the response body already contains wallet_id and user_id — returned directly.
     * On 409 (user already exists), falls back to getSubUserProfile() to resolve IDs.
     *
     * @param int $moodleUserId
     * @return array Profile array: { user_id, username, org_id, wallet_id, moodle_user_id }
     * @throws CreditServiceException
     */
    /**
     * Ensure a Moodle user exists in Arina AND has a provisioned credit wallet.
     *
     * Flow:
     *   1. GET /organisation/user/profile
     *      → 200 with wallet_id  : return immediately (1 API call)
     *      → 200 with null wallet_id : wallet provisioning was skipped; fall through to register
     *      → 404                 : user not found; fall through to register
     *   2. POST /organisation/user/register
     *      → 200 with wallet_id  : return registration payload directly
     *      → anything else       : throw CreditServiceException
     *
     * @param int $moodleUserId
     * @return array Profile: { user_id, username, org_id, wallet_id, moodle_user_id }
     * @throws CreditServiceException
     */
    public function ensureSubUserRegistered(int $moodleUserId): array
    {
        $orgId = \local_arina_prism_sense\CompanyConfig::getOrgId();
        if (empty($orgId)) {
            throw new CreditServiceException(
                'Plugin is not registered with Arina. Complete registration first.'
            );
        }

        // Step 1: Try to resolve an existing profile.
        $existingProfile = null;
        try {
            $existingProfile = $this->getSubUserProfile($moodleUserId);
        } catch (CreditServiceException $e) {
            // Only fall through to registration when the user genuinely doesn't exist.
            // Any other error (502, auth failure, etc.) must propagate immediately.
            if (strpos($e->getMessage(), 'not found in Arina') === false) {
                throw $e;
            }
        }

        // Profile found AND wallet already provisioned — nothing left to do.
        if ($existingProfile !== null && !empty($existingProfile['wallet_id'])) {
            return $existingProfile;
        }

        // Step 2: Register (creates user + wallet) or re-registers to provision a missing wallet.
        global $DB;
        $moodleUser = $DB->get_record('user', ['id' => $moodleUserId], '*', MUST_EXIST);

        $payload = [
            'org_id'         => $orgId,
            'username'       => $moodleUser->username,
            'email'          => $moodleUser->email,
            'firstname'      => $moodleUser->firstname,
            'lastname'       => $moodleUser->lastname,
            'moodle_user_id' => $moodleUserId,
        ];

        $url = rtrim(IOMAD_SERVICE_URL, '/') . '/organisation/user/register';
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-Api-Key: ' . $this->apiKey,
            ],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $raw      = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($raw, true) ?? [];

        if ($httpCode === 200 && !empty($data['wallet_id']) && !empty($data['user_id'])) {
            return $data;
        }

        $detail = $data['detail'] ?? $data['message'] ?? "HTTP $httpCode";
        throw new CreditServiceException("Sub-user registration failed: $detail");
    }

    /**
     * Fetch the Arina profile for a Moodle user via the profile endpoint.
     * Returns: { user_id, username, org_id, wallet_id, moodle_user_id }
     *
     * @param int $moodleUserId
     * @return array
     * @throws CreditServiceException
     */
    public function getSubUserProfile(int $moodleUserId): array
    {
        $orgId = \local_arina_prism_sense\CompanyConfig::getOrgId();
        $query = http_build_query(['org_id' => $orgId, 'moodle_user_id' => $moodleUserId], '', '&');
        $url   = rtrim(IOMAD_SERVICE_URL, '/') . '/organisation/user/profile?' . $query;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'X-Api-Key: ' . $this->apiKey,
            ],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $raw      = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($raw, true) ?? [];

        // Return the profile on any 200, even when wallet_id is null.
        // Callers that need a wallet (getSubUserProfileCached / ensureSubUserRegistered)
        // will trigger registration to provision the missing wallet.
        if ($httpCode === 200 && !empty($data['user_id'])) {
            return $data;
        }

        if ($httpCode === 404) {
            throw new CreditServiceException(
                "User (Moodle ID: $moodleUserId) not found in Arina."
            );
        }

        $detail = $data['detail'] ?? "HTTP $httpCode";
        throw new CreditServiceException("Could not resolve sub-user profile: $detail");
    }

    /**
     * Get the Arina user_id for a Moodle user (used by content generation APIs).
     * Uses the cached profile lookup so the remote API is only called once per
     * browser session (cookie hit) or cron run (preference hit).
     *
     * @param int $userId Moodle user ID
     * @return string The Arina user_id (UUID)
     * @throws CreditServiceException
     */
    public function getUserOwnerUuid($userId)
    {
        $profile = $this->getSubUserProfileCached((int) $userId);
        if (empty($profile['user_id'])) {
            throw new CreditServiceException(
                "Could not resolve Arina user_id for Moodle user {$userId}."
            );
        }
        return $profile['user_id'];
    }

    // -----------------------------------------------------------------------
    // Cookie-backed profile cache
    // -----------------------------------------------------------------------

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

    /**
     * Resolve the Arina profile for a Moodle user, using a browser cookie as a
     * short-lived cache. Registers the user (and provisions a wallet) if they
     * don't exist in Arina yet, or if their profile has a null wallet_id.
     *
     * Resolution order (web context):
     *   1. Cookie hit (valid user_id + wallet_id)  → return immediately (0 API calls)
     *   2. ensureSubUserRegistered()               → profile lookup → register if needed
     *   3. Write cookie when wallet_id is present  → future requests are served from cache
     *
     * In cron/CLI context the cookie layer is skipped entirely and the API is called
     * directly (same behaviour as before this change).
     *
     * @param int $moodleUserId
     * @return array Profile: { user_id, username, org_id, wallet_id, moodle_user_id }
     * @throws CreditServiceException
     */
    public function getSubUserProfileCached(int $moodleUserId): array
    {
        // --- 1. Cookie cache (web only) ---
        if ($this->isWebContext()) {
            $cached = $this->getProfileFromCookie($moodleUserId);
            if ($cached !== null) {
                return $cached;
            }
        }

        // --- 2. API fetch (registers + provisions wallet when not yet done) ---
        $profile = $this->ensureSubUserRegistered($moodleUserId);

        // --- 3. Cache result (web only, only when wallet is present) ---
        if ($this->isWebContext() && !empty($profile['wallet_id'])) {
            $this->setProfileCookie($moodleUserId, $profile);
        }

        return $profile;
    }

    /**
     * Resolve an owner UUID to its actual wallet ID.
     * @param string $ownerUuid The owner UUID
     * @return string The wallet ID
     * @throws \Exception if wallet not found
     */
    public function resolveWalletId($ownerUuid)
    {
        $res = $this->getWalletByOwner($ownerUuid);
        if ($res['status'] >= 200 && $res['status'] < 300 && !empty($res['data']['id'])) {
            return $res['data']['id'];
        }
        throw new CreditServiceException("Could not resolve wallet for owner: {$ownerUuid}");
    }

    /**
     * Lookup a sub-user wallet by external ID (Moodle user ID).
     * @param string $externalId The Moodle user ID
     * @param string $parentOwnerId The parent org owner UUID
     * @return array API response
     */
    public function getSubUserWallet($externalId, $parentOwnerId)
    {
        return $this->makeRequest('GET', "/wallets/sub-user/{$externalId}?parent_id={$parentOwnerId}");
    }

    public function createWallet($ownerId, $type = 'INDIVIDUAL', $parentWalletId = null, $externalSubUserId = null)
    {
        $payload = [
            'owner_id' => $ownerId,
            'type' => $type
        ];
        if ($parentWalletId) {
            $payload['parent_wallet_id'] = $parentWalletId;
        }
        if ($externalSubUserId) {
            $payload['external_sub_user_id'] = $externalSubUserId;
        }
        return $this->makeRequest('POST', '/wallets', $payload);
    }
    
    public function getBalance($ownerId)
    {
        return $this->makeRequest('GET', "/wallets/owner/{$ownerId}/balance");
    }

    public function getWalletBalance($walletId)
    {
        return $this->makeRequest('GET', "/wallets/{$walletId}/balance");
    }

    public function getWalletByOwner($ownerId)
    {
        $res = $this->makeRequest('GET', "/wallets?owner_id={$ownerId}");
        if ($res['status'] >= 200 && $res['status'] < 300 && !empty($res['data']) && is_array($res['data'])) {
            // Arina returns an array of wallets for this query. We want the first one.
            $res['data'] = $res['data'][0];
        } elseif ($res['status'] == 200 && empty($res['data'])) {
            // If empty array, simulate 404 for existing callers
            $res['status'] = 404;
            $res['data'] = ['detail' => 'Not Found'];
        }
        return $res;
    }


    public function getHierarchy($walletId)
    {
        return $this->makeRequest('GET', "/wallets/{$walletId}/hierarchy");
    }

    public function getTransactions($walletId, $limit = 100, $skip = 0)
    {
        $query = http_build_query([
            'limit' => $limit,
            'skip' => $skip
        ], '', '&');
        return $this->makeRequest('GET', "/wallets/{$walletId}/transactions?{$query}");
    }

    /**
     * Get aggregated transactions for all child (sub-user) wallets under an org wallet.
     * Returns ChildTransactionList: {transactions[], total, parent_wallet_id, child_wallet_count}
     * Each transaction includes owner_id, external_sub_user_id, wallet_type metadata.
     *
     * @param string $orgWalletId The organization wallet ID
     * @param int    $limit       Max records (default 100)
     * @param int    $skip        Pagination offset
     * @return array API response
     */
    public function getChildTransactions($orgWalletId, $limit = 100, $skip = 0)
    {
        $query = http_build_query([
            'limit' => $limit,
            'skip'  => $skip
        ], '', '&');
        return $this->makeRequest('GET', "/wallets/{$orgWalletId}/child-transactions?{$query}");
    }

    public function allocateCredits($sourceWalletId, $targetWalletIds, $amountPerWallet, $performedByUserId = null)
    {
        $payload = [
            'source_wallet_id' => $sourceWalletId,
            'target_wallet_ids' => $targetWalletIds,
            'amount_per_wallet' => $amountPerWallet
        ];
        if ($performedByUserId) {
            $payload['performed_by_user_id'] = $performedByUserId;
        }
        return $this->makeRequest('POST', '/wallets/allocate', $payload);
    }

    /**
     * Reclaim credits from a sub-user wallet back to the parent organization.
     * Uses the dedicated POST /wallets/{sub_wallet_id}/reclaim endpoint.
     * Authorization headers (X-User-ID, X-User-Role) are injected by nginx.
     *
     * @param string $subWalletId  The sub-user's actual wallet ID (UUID)
     * @param float  $amount       Amount of credits to reclaim (must be > 0)
     * @param string|null $reason  Optional audit trail reason
     * @return array API response
     */
    public function reclaimCredits($subWalletId, $amount, $reason = null)
    {
        $payload = ['amount' => $amount];
        if ($reason !== null) {
            $payload['reason'] = $reason;
        }
        return $this->makeRequest('POST', "/wallets/{$subWalletId}/reclaim", $payload);
    }

    /**
     * Get organization-wide reserved credits (org + all child wallets).
     * @param string $ownerId Organization owner UUID
     * @return array API response with org_own_reserved, children_reserved, total_reserved
     */
    public function getOrgReservedCredits($ownerId)
    {
        return $this->makeRequest('GET', "/credits/usage/reserved/org/{$ownerId}");
    }

    public function generateV4UUID()
    {
        if (class_exists('\core\uuid')) {
            return \core\uuid::generate();
        }
        // Fallback for older Moodle versions.
        // Using random_int() instead of mt_rand() for cryptographically
        // secure pseudo-random number generation to prevent UUID collisions.
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0x0fff) | 0x4000,
            random_int(0, 0x3fff) | 0x8000,
            random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0xffff)
        );
    }
}
