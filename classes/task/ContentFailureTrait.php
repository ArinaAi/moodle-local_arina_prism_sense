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
 * Failure handling and response-parsing helpers for generate_content_task.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait ContentFailureTrait
{
    /**
     * Extract error message from API response
     *
     * @param array $apiResponse API response
     * @return string Error message
     */
    private function extractErrorMessage($apiResponse)
    {
        $errorMsg = 'Generation failed';

        if (isset($apiResponse['message'])) {
            $errorMsg = is_string($apiResponse['message'])
                ? $apiResponse['message']
                : json_encode($apiResponse['message']);
        } else if (isset($apiResponse['error'])) {
            $errorMsg = is_string($apiResponse['error'])
                ? $apiResponse['error']
                : json_encode($apiResponse['error']);
        } else if (isset($apiResponse['detail'])) {
            $errorMsg = is_string($apiResponse['detail'])
                ? $apiResponse['detail']
                : json_encode($apiResponse['detail']);
        }

        return $errorMsg;
    }

    /**
     * Check if response is an async/Kafka response (processing status)
     */
    private function isAsyncResponse($apiResponse)
    {
        if (!$apiResponse) {
            return false;
        }

        // Check for Kafka-style response with status: "processing"
        $status = $apiResponse['status'] ?? '';
        return $status === 'processing' || $status === 'queued' || $status === 'pending';
    }

    /**
     * Handle failure by updating status to error.
     * Only sentinel codes (PDF_UPLOAD_FAILED, CURRICULUM_MISMATCH, etc.) should
     * be passed here — never raw backend text.
     */
    private function handleFailure($contentId, $errorMessage)
    {
        global $DB;
        $DB->update_record(
            'local_arina_prism_sense_content',
            (object) [
                'id'           => $contentId,
                'status'       => 'error',
                'errormessage' => $errorMessage,
                'timemodified' => time(),
            ]
        );

        $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentId]);
        if ($content) {
            try {
                \local_arina_prism_sense\EmailNotifier::sendContentFailure($content, $errorMessage);
            } catch (\Throwable $emailEx) {
                mtrace("    Email notification failed (non-fatal): " . $emailEx->getMessage());
            }

            // If the failure was due to insufficient credits, send low-credits alerts directly
            if ($errorMessage === 'INSUFFICIENT_CREDITS') {
                $this->sendInsufficientCreditsAlert($content);
            }
        }
    }

    /**
     * Send low-credits alert emails directly on an INSUFFICIENT_CREDITS failure,
     * without relying on the background state-machine.
     * Synchronizes state so background check won't double-fire.
     */
    private function sendInsufficientCreditsAlert($content)
    {
        global $DB;
        $userid = (int) ($content->userid ?? $content->createdby ?? 0);
        if (!$userid) {
            return;
        }

        $user = $DB->get_record('user', ['id' => $userid, 'deleted' => 0]);
        if (!$user) {
            return;
        }

        // Fetch live balance if possible (for accurate number in email body).
        $balance = 0.0;
        $uuid    = get_user_preferences('arina_prism_sense_wallet_sub_user_id', null, $userid);
        if ($uuid) {
            try {
                $client   = new \local_arina_prism_sense\cms\CreditServiceClient();
                $walletId = $client->resolveWalletId($uuid);
                if ($walletId) {
                    $balRes = $client->getWalletBalance($walletId);
                    if ($balRes['status'] >= 200 && $balRes['status'] < 300) {
                        $balance = (float) ($balRes['data']['current_balance'] ?? 0);
                    }
                }
            } catch (\Throwable $e) {
                mtrace("    Could not fetch balance for alert email: " . $e->getMessage());
            }
        }

        $isZero = $balance <= 0;

        mtrace("    INSUFFICIENT_CREDITS failure — sending low-credits alert for user {$userid} (balance={$balance}).");

        try {
            // Notify the user themselves.
            \local_arina_prism_sense\EmailNotifier::sendLowCreditsUser($user, $balance, 100.0, $isZero);

            // Notify all admins / company managers about this specific user's low wallet.
            $admins = \local_arina_prism_sense\Utils::getAdminsAndCompanyManagers($userid);
            foreach ($admins as $admin) {
                \local_arina_prism_sense\EmailNotifier::sendLowCreditsUserToAdmin(
                    $admin,
                    $user,
                    $balance,
                    100.0,
                    $isZero
                );
            }

            // Sync the state preference so the background checker won't re-fire.
            $newState = $isZero ? 'zero' : 'low';
            set_user_preference('arina_prism_sense_low_credits_state', $newState, $userid);
        } catch (\Throwable $e) {
            mtrace("    Error sending low-credits alert emails: " . $e->getMessage());
        }
    }

    /**
     * Classify a raw backend error string into a sentinel code.
     *
     * Sentinel codes are the ONLY values that should be written to the
     * errormessage DB column. Raw error text is intentionally discarded here
     * and only kept in mtrace/error_log output for admin debugging.
     *
     * Sentinels:
     *   PDF_UPLOAD_FAILED      – PDF/batch upload problem
     *   CURRICULUM_MISMATCH    – curriculum/content-strategy mismatch
     *   INSUFFICIENT_CREDITS   – quota / wallet / credit exhausted
     *   VIDEO_FAILED           – video-specific failure (non-credit)
     *   ''                     – generic fallback (slide/content generation)
     *
     * @param  string $raw  Raw error text from the backend or PHP exception message
     * @return string       Sentinel code, or '' for generic/unknown errors
     */
    private function classifyError(string $raw): string
    {
        return \local_arina_prism_sense\ErrorClassifier::classify($raw);
    }
}
