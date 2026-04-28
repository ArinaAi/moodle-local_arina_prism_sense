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

namespace local_arina_prism_sense;

/**
 * Classifies raw backend error strings into sentinel codes.
 *
 * Sentinel codes are the ONLY values written to the errormessage DB column.
 * Raw error text is intentionally discarded here and kept only in
 * mtrace() / error_log() output for admin debugging.
 *
 * Sentinel codes:
 *   PDF_UPLOAD_FAILED    – PDF/batch upload problem
 *   CURRICULUM_MISMATCH  – curriculum/content-strategy mismatch
 *   INSUFFICIENT_CREDITS – quota/wallet/credit exhausted
 *   VIDEO_FAILED         – video-specific failure (non-credit)
 *   ''                   – generic fallback (slide/content generation)
 *
 * @package local_arina_prism_sense
 * @copyright 2025 Arina AI <info@arina.ai>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ErrorClassifier
{
    /** @var string[] Known sentinel codes that need no further classification. */
    private const KNOWN_SENTINELS = [
        'PDF_UPLOAD_FAILED',
        'CURRICULUM_MISMATCH',
        'INSUFFICIENT_CREDITS',
        'VIDEO_FAILED',
    ];

    /**
     * Classify a raw backend error string into a sentinel code.
     *
     * @param  string $raw Raw error text from the backend or PHP exception message
     * @return string      Sentinel code, or '' for generic/unknown errors
     */
    public static function classify(string $raw): string
    {
        if (in_array($raw, self::KNOWN_SENTINELS, true)) {
            return $raw;
        }

        $lower = strtolower($raw);
        $sentinel = '';

        if (
            str_contains($lower, 'upload') || str_contains($lower, 'pdf') ||
            str_contains($lower, 'batch') || str_contains($lower, 'not processed')
        ) {
            $sentinel = 'PDF_UPLOAD_FAILED';
        } elseif (
            str_contains($lower, 'credit') || str_contains($lower, 'insufficient') ||
            str_contains($lower, 'balance') || str_contains($lower, 'quota') ||
            str_contains($lower, 'wallet') || str_contains($lower, 'limit exceeded')
        ) {
            $sentinel = 'INSUFFICIENT_CREDITS';
        } elseif (
            str_contains($lower, 'curriculum') || str_contains($lower, 'mismatch') ||
            str_contains($lower, 'content_type') || str_contains($lower, 'strategy')
        ) {
            $sentinel = 'CURRICULUM_MISMATCH';
        } elseif (str_contains($lower, 'video')) {
            $sentinel = 'VIDEO_FAILED';
        }

        // Empty string → UI shows "Slide/Content generation failed. Please try again."
        return $sentinel;
    }
}
