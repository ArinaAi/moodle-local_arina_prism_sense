<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
namespace local_arina_prism_sense\task;

defined('MOODLE_INTERNAL') || die();

/**
 * User wallet UUID resolution and credit-state sync for generate_content_task.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait UserCreditTrait
{
    /**
     * If the user's balance is now >= 100 (i.e. they topped up out-of-band),
     * reset the arina_prism_sense_low_credits_state preference to 'ok' so that the
     * post-generation credit check can fire again when the balance next drops.
     *
     * @param string|null $userUuid The resolved wallet owner UUID
     * @param object      $data     Task custom data
     */
    private function syncCreditStateIfTopped($userUuid, $data)
    {
        if (!$userUuid || empty($data->user_id)) {
            return;
        }
        try {
            $client   = new \local_arina_prism_sense\cms\CreditServiceClient();
            $walletId = $client->resolveWalletId($userUuid);
            if (!$walletId) {
                return;
            }
            $balRes = $client->getWalletBalance($walletId);
            $isOk   = $balRes['status'] >= 200
                && $balRes['status'] < 300
                && isset($balRes['data']['current_balance']);
            if (!$isOk) {
                return;
            }
            $balance = (float) $balRes['data']['current_balance'];
            if ($balance >= 100) {
                $uid       = (int) $data->user_id;
                $lastState = get_user_preferences('arina_prism_sense_low_credits_state', 'ok', $uid);
                if ($lastState !== 'ok') {
                    set_user_preference('arina_prism_sense_low_credits_state', 'ok', $uid);
                    mtrace("    Reset low credits state to 'ok' for user {$uid} (balance={$balance})");
                }
            }
        } catch (\Throwable $e) {
            // Silently bypass on fetch error
        }
    }

    /**
     * Get user's personal wallet UUID for credit tracking.
     *
     * All users (admins and sub-users) use the same arina_prism_sense_wallet_sub_user_id
     * preference. An admin's personal wallet is created JIT on first allocation from
     * the org wallet. If no wallet exists yet, returns null (generation still works
     * but credits won't be tracked against any specific wallet).
     *
     * @param object $data Task custom data
     * @return string|null User's personal wallet owner UUID, or null if not available
     */
    private function getUserUuidForCredit($data): ?string
    {
        if (!isset($data->user_id)) {
            mtrace("No user_id in task data");
            return null;
        }

        $moodleUserId = (int) $data->user_id;
        mtrace("Looking up personal wallet UUID for user_id: {$moodleUserId}");

        $cached = $this->getCachedUserUuid($moodleUserId);
        if ($cached !== null) {
            return $cached;
        }

        return $this->resolveUserUuidFromApi($moodleUserId);
    }

    /**
     * Return the wallet UUID from Moodle user-preference cache (fast path), or null.
     *
     * @param int $moodleUserId
     * @return string|null
     */
    private function getCachedUserUuid(int $moodleUserId): ?string
    {
        try {
            $userUuid = get_user_preferences('arina_prism_sense_wallet_sub_user_id', null, $moodleUserId);
            if (!empty($userUuid)) {
                mtrace("Found personal wallet UUID (cached): {$userUuid}");
                return $userUuid;
            }
        } catch (\Exception $e) {
            mtrace("Warning: Could not read user preference: " . $e->getMessage());
        }
        return null;
    }

    /**
     * Resolve the wallet UUID via the Arina profile endpoint (slow path).
     * Persists the resolved UUID to Moodle user preferences for future cron runs.
     *
     * @param int $moodleUserId
     * @return string|null
     */
    private function resolveUserUuidFromApi(int $moodleUserId): ?string
    {
        // ensureSubUserRegistered() registers the user and provisions a wallet if needed.
        mtrace("No cached UUID for user {$moodleUserId} — resolving via Arina profile endpoint.");
        try {
            $client   = new \local_arina_prism_sense\cms\CreditServiceClient();
            $profile  = $client->ensureSubUserRegistered($moodleUserId);
            $userUuid = $profile['user_id'] ?? null;

            if (!empty($userUuid)) {
                // Cache the resolved UUID so future cron runs skip the API call.
                set_user_preference('arina_prism_sense_wallet_sub_user_id', $userUuid, $moodleUserId);
                mtrace("Resolved and cached personal wallet UUID: {$userUuid}");
                return $userUuid;
            }

            mtrace("Profile resolved but user_id is empty for user {$moodleUserId} — credit tracking skipped.");
        } catch (\Exception $e) {
            mtrace("Warning: Could not resolve user UUID from Arina: " . $e->getMessage());
        }
        return null;
    }
}
