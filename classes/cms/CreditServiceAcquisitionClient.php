<?php

/**
 * Arina Credit Service Acquisition Client
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_arina_prism_sense\cms;

defined('MOODLE_INTERNAL') || die();

class CreditServiceAcquisitionClient extends CreditServiceClient
{
    public function getAcquisitions($userId)
    {
        // Arina API requires user_id (owner UUID), not wallet_id
        return $this->makeRequest('GET', "/acquisitions?user_id={$userId}");
    }

    public function createAcquisition($userId, $packageId, $couponCode = null)
    {
        $payload = [
            'user_id' => $userId,
            'package_id' => $packageId,
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
            'status' => $status,
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
}
