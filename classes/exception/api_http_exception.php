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
 * Exception thrown when the backend API returns an HTTP error code
 */
class api_http_exception extends \moodle_exception
{
    /**
     * Constructor
     *
     * @param string $debuginfo Optional debug info
     */
    public function __construct($debuginfo = null)
    {
        // Fallback to general error message if specific string not found
        parent::__construct('generalexceptionmessage', 'error', '', $debuginfo);
    }
}
