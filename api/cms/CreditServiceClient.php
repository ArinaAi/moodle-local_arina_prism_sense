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
        $this->apiKey = get_config('local_lecturebot', 'api_key');
        if (empty($this->apiKey)) {
            $this->apiKey = getenv('LECTUREBOT_API_KEY'); // fallback
        }
        $this->baseUrl = LECTUREBOT_CREDIT_SERVICE_URL;
    }

    private function makeRequest($method, $endpoint, $payload = null)
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
            'data' => $decodedData
        ];
    }
    
    // Check if Org Wallet exists in Moodle config and create it JIT if missing
    public function getOrInitializeOrgWallet()
    {
        $uuid = get_config('local_lecturebot', 'org_wallet_owner_id');
        if (empty($uuid)) {
            $uuid = $this->generateV4UUID();
            set_config('org_wallet_owner_id', $uuid, 'local_lecturebot');
            
            // Create in Credit Service
            $this->createWallet($uuid, 'ORGANIZATION');
        }
        return $uuid;
    }
    
    // Check if Sub-user Wallet exists in Moodle user preferences and create JIT if missing
    // Returns the actual WALLET ID (not owner UUID)
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

    public function getAcquisitions($userId)
    {
        // Arina API requires user_id (owner UUID), not wallet_id
        return $this->makeRequest('GET', "/acquisitions?user_id={$userId}");
    }

    public function createAcquisition($userId, $packageId, $couponCode = null)
    {
        $payload = [
            'user_id' => $userId,
            'package_id' => $packageId
        ];
        if ($couponCode) {
            $payload['coupon_code'] = $couponCode;
        }
        return $this->makeRequest('POST', '/acquisitions/initiate', $payload);
    }

    public function confirmAcquisition($acquisitionId, $paymentId, $status)
    {
        $payload = [
            'acquisition_id' => $acquisitionId,
            'payment_id' => $paymentId,
            'status' => $status
        ];
        return $this->makeRequest('POST', "/acquisitions/confirm", $payload);
    }

    public function getPackages($limit = 100, $skip = 0)
    {
        return $this->makeRequest('GET', "/packages?limit={$limit}&skip={$skip}&is_active=true");
    }

    public function getCoupons($limit = 50, $offset = 0)
    {
        return $this->makeRequest('GET', "/coupons?limit={$limit}&offset={$offset}");
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
