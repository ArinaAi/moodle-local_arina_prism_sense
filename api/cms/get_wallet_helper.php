<?php

/**
 * CMS API: Helper for fetching Wallet ID
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

function local_arina_prism_sense_get_wallet_id_or_exit($client)
{
    // 1. Fetch Org Owner UUID
    $orgOwnerUuid = $client->getOrInitializeOrgWallet();

    // 2. Resolve the actual wallet ID from the owner UUID
    $walletRes = $client->getWalletByOwner($orgOwnerUuid);

    // If the wallet doesn't exist yet (404), there's no usage
    if ($walletRes['status'] == 404) {
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    if ($walletRes['status'] < 200 || $walletRes['status'] >= 300) {
        http_response_code($walletRes['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Could not resolve wallet for this organization',
            'details' => $walletRes['data'],
        ]);
        exit;
    }

    $walletId = $walletRes['data']['id'] ?? null;
    if (empty($walletId)) {
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    return $walletId;
}
