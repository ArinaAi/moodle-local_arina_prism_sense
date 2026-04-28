<?php

/**
 * CMS API: Get Coupons
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');

// Require login; allow Site Admins and IOMAD Company Managers.
require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

header('Content-Type: application/json');

try {
    $client = new \local_arina_prism_sense\cms\CreditServiceAcquisitionClient();

    $res = $client->getCoupons();

    if ($res['status'] >= 200 && $res['status'] < 300) {
        $couponsData = is_array($res['data']) ? $res['data'] : [];

        $coupons = [];
        foreach ($couponsData as $coupon) {
            $coupons[] = [
                'id' => $coupon['id'] ?? '',
                'code' => $coupon['code'] ?? '',
                'description' => $coupon['description'] ?? '',
                'discount_type' => $coupon['discount_type'] ?? 'PERCENTAGE',
                'discount_value' => (float)($coupon['value'] ?? 0),
                'is_active' => $coupon['is_active'] ?? true,
                'usage_limit' => $coupon['max_uses'] ?? null,
                'times_used' => $coupon['current_uses'] ?? 0,
                'valid_from' => $coupon['valid_from'] ?? null,
                'valid_until' => $coupon['valid_until'] ?? null,
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $coupons,
        ]);
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch coupons from Credit Service',
            'details' => $res['data'],
        ]);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage(),
    ]);
}
