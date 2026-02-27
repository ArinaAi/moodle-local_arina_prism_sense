<?php
/**
 * CMS API: Get Usage Metrics (Aggregated service usage)
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/CreditServiceClient.php');
require_once(__DIR__ . '/get_wallet_helper.php');

// Require login and admin cap
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

header('Content-Type: application/json');

try {
    $client = new \local_lecturebot\cms\CreditServiceClient();
    
    // 1-2. Fetch Org Owner UUID and resolve the actual wallet ID
    $walletId = get_wallet_id_or_exit($client);
    
    // 3. Fetch transactions (fetching up to 1000 to get a good sample for the chart)
    $res = $client->getTransactions($walletId, 1000);
    
    if ($res['status'] >= 200 && $res['status'] < 300) {
        $txs = $res['data']['transactions'] ?? [];
        
        $metrics = [
            'slide_generation' => 0,
            'slide_regeneration' => 0,
            'video_generation' => 0
        ];
        
        foreach ($txs as $tx) {
            if ($tx['transaction_type'] === 'CONSUMPTION') {
                $amount = abs((float)$tx['credit_amount']);
                
                // Inspect metadata to see the action key
                $meta = $tx['extra_metadata'] ?? [];
                $actionKey = $meta['action_key'] ?? 'unknown';
                
                // Map the action keys to our display labels
                // We're expecting things like 'generate_slides', 'regenerate_slide', 'generate_video'
                if (strpos($actionKey, 'slide') !== false && strpos($actionKey, 're') === false) {
                    $metrics['slide_generation'] += $amount;
                } elseif (strpos($actionKey, 'regenerate') !== false) {
                    $metrics['slide_regeneration'] += $amount;
                } elseif (strpos($actionKey, 'video') !== false) {
                    $metrics['video_generation'] += $amount;
                }
            }
        }
        
        // Format for the frontend DONUT_DATA shape: [{name, value, color}]
        $chartData = [];
        $metricConfigs = [
            ['key' => 'slide_generation', 'name' => 'Slide Generation', 'color' => '#6F42C1'],
            ['key' => 'slide_regeneration', 'name' => 'Slide Regeneration', 'color' => '#8A94DF'],
            ['key' => 'video_generation', 'name' => 'Video Generation', 'color' => '#2ECC71'],
        ];

        foreach ($metricConfigs as $config) {
            if ($metrics[$config['key']] > 0) {
                $chartData[] = [
                    'name' => $config['name'],
                    'value' => round($metrics[$config['key']]),
                    'color' => $config['color'],
                ];
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $chartData
        ]);
        
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch usage metrics',
            'details' => $res['data'] ?? null
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error while fetching metrics',
        'error' => $e->getMessage()
    ]);
}
