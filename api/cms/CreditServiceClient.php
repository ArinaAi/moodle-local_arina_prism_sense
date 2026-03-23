<?php
/**
 * Arina Credit Service API Client
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_lecturebot\cms;

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
        $this->apiKey = \local_lecturebot\CompanyConfig::getApiKey()
            ?? get_config('local_lecturebot', 'api_key')
            ?: getenv('LECTUREBOT_API_KEY');
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
        $uuid = \local_lecturebot\CompanyConfig::getOrgWalletOwnerId()
            ?? get_config('local_lecturebot', 'org_wallet_owner_id');

        if (empty($uuid)) {
            $uuid = $this->generateV4UUID();
            // Persists to local_lecturebot_company_config (IOMAD) or config_plugins
            // (standalone) and updates the in-memory cache automatically.
            \local_lecturebot\CompanyConfig::setOrgWalletOwnerId($uuid);

            // Create in Credit Service
            $this->createWallet($uuid, 'ORGANIZATION');
        }
        return $uuid;
    }
    
    // Check if Sub-user Wallet exists in Moodle user preferences and create JIT if missing
    // Returns the actual WALLET ID (not owner UUID)
    // Note: owner_id = UUID stored in preferences, wallet_id = actual wallet identifier in Credit Service
    public function getOrInitializeSubUserWallet($userId)
    {
        $uuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $userId);
        if (empty($uuid)) {
            $uuid = $this->generateV4UUID();
            set_user_preference('lecturebot_wallet_sub_user_id', $uuid, $userId);
            
            // Get parent org wallet ID (not owner UUID)
            $parentOrgOwnerUuid = $this->getOrInitializeOrgWallet();
            $parentWalletId = $this->resolveWalletId($parentOrgOwnerUuid);
            
            // Create in Credit Service as SUB_USER with parent link
            $this->createWallet($uuid, 'SUB_USER', $parentWalletId, (string)$userId);
        }
        // Resolve owner UUID -> wallet ID
        return $this->resolveWalletId($uuid);
    }

    /**
     * Get user's owner UUID (not wallet_id) for content generation APIs.
     * Returns the UUID stored in user preferences.
     * @param int $userId Moodle user ID
     * @return string The owner UUID
     * @throws \Exception if UUID not found
     */
    public function getUserOwnerUuid($userId)
    {
        $uuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $userId);
        if (empty($uuid)) {
            throw new CreditServiceException(
                "User {$userId} does not have a wallet UUID. ".
                "Admin must allocate credits to this user first via CMS dashboard."
            );
        }
        return $uuid;
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
        ]);
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
        ]);
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
