/**
 * Security Utilities
 * Client-side input sanitization and validation
 */

const SecurityUtils = {
    /**
     * Escape HTML special characters to prevent XSS attacks
     * @param {string} str - Input string to sanitize
     * @returns {string} - Sanitized string safe for HTML rendering
     */
    escapeHTML: function (str) {
        if (typeof str !== 'string') return '';

        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return str.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
    },

    /**
     * Validate and sanitize alphanumeric input (Roll Number, Username)
     * @param {string} input - Input to validate
     * @param {number} maxLength - Maximum allowed length
     * @returns {Object} - {valid: boolean, sanitized: string, error: string}
     */
    validateAlphanumeric: function (input, maxLength = 50) {
        if (typeof input !== 'string') {
            return { valid: false, sanitized: '', error: 'Input must be text' };
        }

        // Trim whitespace
        const trimmed = input.trim();

        // Check if empty
        if (trimmed.length === 0) {
            return { valid: false, sanitized: '', error: 'Field cannot be empty' };
        }

        // Check length
        if (trimmed.length > maxLength) {
            return { valid: false, sanitized: trimmed, error: `Maximum ${maxLength} characters allowed` };
        }

        // Check for valid characters (alphanumeric + hyphen for roll numbers)
        const validPattern = /^[a-zA-Z0-9-]+$/;
        if (!validPattern.test(trimmed)) {
            return { valid: false, sanitized: trimmed, error: 'Only letters, numbers, and hyphens allowed' };
        }

        // Escape HTML to prevent XSS
        const sanitized = this.escapeHTML(trimmed);

        return { valid: true, sanitized: sanitized, error: null };
    },

    /**
     * Validate password
     * @param {string} password - Password to validate
     * @param {number} maxLength - Maximum allowed length
     * @returns {Object} - {valid: boolean, sanitized: string, error: string}
     */
    validatePassword: function (password, maxLength = 100) {
        if (typeof password !== 'string') {
            return { valid: false, sanitized: '', error: 'Password must be text' };
        }

        // Trim whitespace
        const trimmed = password.trim();

        // Check if empty
        if (trimmed.length === 0) {
            return { valid: false, sanitized: '', error: 'Password cannot be empty' };
        }

        // Check length
        if (trimmed.length > maxLength) {
            return { valid: false, sanitized: trimmed, error: `Maximum ${maxLength} characters allowed` };
        }

        // Escape HTML to prevent XSS
        const sanitized = this.escapeHTML(trimmed);

        return { valid: true, sanitized: sanitized, error: null };
    },

    /**
     * Strip all HTML tags and scripts from input
     * @param {string} str - Input string
     * @returns {string} - Cleaned string
     */
    stripHTML: function (str) {
        if (typeof str !== 'string') return '';
        return str.replace(/<[^>]*>/g, '');
    }
};
