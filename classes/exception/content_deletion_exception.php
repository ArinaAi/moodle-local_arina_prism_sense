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
namespace local_lecturebot\exception;

defined('MOODLE_INTERNAL') || die();

/**
 * Exception thrown when content deletion fails
 */
class content_deletion_exception extends \moodle_exception
{
    /**
     * Constructor
     *
     * @param string $debuginfo Optional debug info
     */
    public function __construct($debuginfo = null)
    {
        // Using 'generalexceptionmessage' with 'error' component as a safe fallback
        // to ensure the message is displayed if specific lang string doesn't exist.
        // Ideally 'deleteerror' or similar would be in local_lecturebot lang file.
        parent::__construct('generalexceptionmessage', 'error', '', $debuginfo);
    }
}
