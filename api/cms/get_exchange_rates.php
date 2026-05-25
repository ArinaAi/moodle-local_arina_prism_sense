<?php

/**
 * CMS API: Get Exchange Rates
 *
 * Proxies the exchange rate lookup so the external URL never appears in client-side code.
 * The target URL is defined in config_api.php as EXCHANGE_RATES_URL.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php'); // NOSONAR - Moodle bootstrap is required in endpoint scripts.
require_once($CFG->libdir . '/moodlelib.php'); // NOSONAR - Moodle core libs are required for require_login().
require_once(__DIR__ . '/../../config_api.php'); // NOSONAR - Plugin constants are loaded from config_api.php.

require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

header('Content-Type: application/json');

try {
    $ch = curl_init(EXCHANGE_RATES_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new \local_arina_prism_sense\exception\curl_execution_exception(
            'Exchange rate fetch failed: ' . $curlError
        );
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new \local_arina_prism_sense\exception\api_http_exception(
            'Exchange rate fetch failed with HTTP ' . $httpCode
        );
    }

    $payload = json_decode($body, true);

    if (!isset($payload['rates']['INR']) || !isset($payload['rates']['EUR'])) {
        throw new \UnexpectedValueException('Exchange rate response missing required currencies (INR, EUR)');
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'USD' => 1,
            'INR' => (float)$payload['rates']['INR'],
            'EUR' => (float)$payload['rates']['EUR'],
        ],
    ]);
} catch (\Exception $e) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'Could not retrieve live exchange rates: ' . $e->getMessage(),
    ]);
}
