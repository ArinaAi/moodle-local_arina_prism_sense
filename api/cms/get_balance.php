<?php
/**
 * CMS API: Get Institution Balance
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/CreditServiceClient.php');

// Require login; allow Site Admins and IOMAD Company Managers.
// requireCmsAccess() also calls bootstrap() so CompanyConfig getters are ready.
require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

header('Content-Type: application/json');

try {
    $client = new \local_arina_prism_sense\cms\CreditServiceClient();
    
    // Get organization owner UUID (external identifier stored in Moodle config)
    // Note: Some APIs require owner_id (UUID), others require wallet_id
    // Balance API uses owner_id for lookup
    $orgUuid = $client->getOrInitializeOrgWallet();
    
    $response = $client->getBalance($orgUuid);
    
    if ($response['status'] >= 200 && $response['status'] < 300) {
        $balanceData = $response['data'];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'current_balance' => isset($balanceData['current_balance']) ?
                (float)$balanceData['current_balance'] : 0,
                'available_balance' => isset($balanceData['available_balance']) ?
                (float)$balanceData['available_balance'] : 0,
                'reserved_credits' => isset($balanceData['reserved_credits']) ?
                (float)$balanceData['reserved_credits'] : 0,
            ]
        ]);
    } else {
        http_response_code($response['status']);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch balance from Arina Credit Service',
            'error' => $response['data']
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
