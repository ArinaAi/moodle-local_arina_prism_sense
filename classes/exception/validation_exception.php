<?php
namespace local_lecturebot\exception;

defined('MOODLE_INTERNAL') || die();

/**
 * Exception thrown when validation fails for required fields
 */
class ValidationException extends \moodle_exception
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
