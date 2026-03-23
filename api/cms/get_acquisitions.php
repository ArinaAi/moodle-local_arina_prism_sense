<?php
/**
 * CMS API: Get Wallet Acquisitions (Purchase History)
 *
 * @package    local_lecturebot
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once __DIR__ . '/CreditServiceAcquisitionClient.php';

// Require login and admin cap
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

header('Content-Type: application/json');

try {
    $client = new \local_lecturebot\cms\CreditServiceAcquisitionClient();
    
    // Get Org Owner UUID (acquisitions API requires owner_id/user_id, not wallet_id)
    // This is the external identifier stored in Moodle config
    $orgOwnerUuid = $client->getOrInitializeOrgWallet();
    
    // Fetch acquisitions directly using owner UUID
    $res = $client->getAcquisitions($orgOwnerUuid);
    
    if ($res['status'] >= 200 && $res['status'] < 300) {
        // API returns a plain array, not {items: [...]}
        $acquisitionsData = is_array($res['data']) ? $res['data'] : [];
        
        $acquisitions = [];
        foreach ($acquisitionsData as $row) {
            // Format TS to 'Feb 15, 2026'
            $date = date('M d, Y', strtotime($row['created_at']));
            
            // Format amounts
            $credits = number_format((float)($row['credits_purchased'] ?? 0));
            
            // Amount paid and currency
            $amountPaid = isset($row['amount_paid']) ? (float)$row['amount_paid'] : 0;
            $currency = isset($row['currency']) ? $row['currency'] : 'INR';
            $paidFormatted = $currency === 'USD' ? '$' . number_format($amountPaid, 2) : '₹' .
            number_format($amountPaid, 2);
            
            // Calculate unit price if possible
            $creditAmount = (float)($row['credits_purchased'] ?? 0);
            $unitPrice = 0;
            if ($creditAmount > 0) {
                $unitPrice = $amountPaid / $creditAmount;
            }
            $unitFormatted = ($currency === 'USD' ? '$' : '₹') . number_format($unitPrice, 3) . '/cr';
            
            // Calculate expiry date from package validity_days
            $expiryFormatted = 'N/A';
            if (isset($row['package']['validity_days']) && $row['package']['validity_days'] > 0) {
                $purchaseDate = strtotime($row['created_at']);
                $validityDays = (int)$row['package']['validity_days'];
                $expiryTimestamp = strtotime("+{$validityDays} days", $purchaseDate);
                $expiryFormatted = date('M d, Y', $expiryTimestamp);
            }
            
            $acquisitions[] = [
                'id' => $row['id'] ?? '',
                'date' => $date,
                'credits' => $credits,
                'paid' => $paidFormatted,
                'unit' => $unitFormatted,
                'expiry' => $expiryFormatted,
                'status' => $row['status'] ?? 'COMPLETED'
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $acquisitions
        ]);
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch acquisitions from Credit Service',
            'details' => $res['data']
        ]);
    }

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
