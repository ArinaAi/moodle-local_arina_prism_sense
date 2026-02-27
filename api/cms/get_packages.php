<?php
/**
 * CMS API: Get Active Pricing Packages
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once __DIR__ . '/../../../../config.php';
require_once __DIR__ . '/CreditServiceClient.php';

// Require login and admin cap
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

header('Content-Type: application/json');

try {
    $client = new \local_lecturebot\cms\CreditServiceClient();
    $res = $client->getPackages();

    if ($res['status'] >= 200 && $res['status'] < 300) {
        $apiPackages = $res['data'];

        // If response is not an array (might be wrapped), unwrap
        if (!is_array($apiPackages)) {
            $apiPackages = [];
        }

        // Accent colors and icons by index for visual variety
        $accents = ['#0f6cbf', '#6F42C1', '#20C997', '#fd7e14', '#dc3545', '#17a2b8'];
        $icons   = ['Presentation', 'Video', 'RefreshCw', 'Layers', 'Layers', 'Layers'];

        $packages = [];
        foreach ($apiPackages as $i => $pkg) {
            $creditAmount = (float)($pkg['credit_amount'] ?? 0);
            $bonus        = (float)($pkg['bonus_credits'] ?? 0);
            $totalCredits = (float)($pkg['total_credits'] ?? ($creditAmount + $bonus));
            $priceInr     = (float)($pkg['price_inr'] ?? 0);
            $pricePerCr   = $pkg['price_per_credit'] ?? ($totalCredits > 0 ? round($priceInr / $totalCredits, 2) : 0);
            $validityDays = (int)($pkg['validity_days'] ?? 0);

            $rows = [
                ['label' => 'Base Credits',    'value' => number_format($creditAmount) . ' Cr'],
                ['label' => 'Bonus Credits',   'value' => number_format($bonus) . ' Cr'],
                ['label' => 'Total Credits',   'value' => number_format($totalCredits) . ' Cr'],
                ['label' => 'Price',           'value' => '₹' . number_format($priceInr, 2)],
                ['label' => 'Per Credit',      'value' => '₹' . number_format((float)$pricePerCr, 2)],
            ];

            if ($validityDays > 0) {
                $rows[] = ['label' => 'Validity', 'value' => $validityDays . ' days'];
            }

            $packages[] = [
                'id'       => $pkg['id'],
                'title'    => $pkg['name'] ?? 'Package',
                'subtitle' => $pkg['description'] ?? '',
                'accent'   => $accents[$i % count($accents)],
                'icon'     => $icons[$i % count($icons)],
                'rows'     => $rows,
                'note'     => $validityDays > 0
                    ? "Credits valid for {$validityDays} days from purchase."
                    : 'Credits do not expire.',
            ];
        }

        echo json_encode(['success' => true, 'data' => $packages]);
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch packages from Credit Service',
            'details' => $res['data']
        ]);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error'   => $e->getMessage()
    ]);
}
