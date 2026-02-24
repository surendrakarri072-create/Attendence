/**
 * Attendance Management System - Configuration
 */

const CONFIG = {
    // API Configuration
    // Automatically switches between local and production with HTTPS enforcement
    API_BASE_URL: 'https://attendence12.onrender.com/api',
    // Debug mode (enables detailed logging)
    DEBUG_MODE: true,

    // Admin Credentials (Client-side validation fallback, primary is now server)
    ADMIN: {
        USERNAME: 'admin',
        // Password validation is now handled by backend
    },

    // Geo-Fencing Configuration
    LOCATION: {
        // Fixed coordinates: Current Premises Location
        LATITUDE: 17.022628,
        LONGITUDE: 82.239012,
        // Allowed radius in meters (Set to 500m for production usage)
        ALLOWED_RADIUS_METERS: 500
    },

    // Time Constraints (24h format)
    TIME: {
        CLOCK_IN_START_HOUR: 9,
        CLOCK_IN_START_MIN: 0,
        CLOCK_IN_END_HOUR: 11,
        CLOCK_IN_END_MIN: 0,

        CLOCK_OUT_START: 14,    // 2:00 PM
        CLOCK_OUT_END: 16,      // 4:00 PM
        MIN_WORKING_HOURS: 4    // Required hours between Clock In and Clock Out
    },

    // User Password Pattern
    PASSWORD_PREFIX: 'Krify@',

    // App Constants
    APP_NAME: 'Attendance Management System',
    STORAGE_KEYS: {
        TOKEN: 'ams_auth_token',
        USER: 'ams_user_info'
    }
};

const UTILS = {
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    },

    validatePassword: (rollNumber, password) => {
        if (!rollNumber || rollNumber.length < 3) return false;
        const lastThreeDigits = rollNumber.slice(-3);
        const expectedPassword = `${CONFIG.PASSWORD_PREFIX}${lastThreeDigits}`;
        return password === expectedPassword;
    },

    /**
     * Format hour and minute to professional string (e.g., 09:00 AM)
     */
    formatTime: (hour, min = 0) => {
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`;
    },

    /**
     * Check if current time is within allowed window for a specific action
     */
    isTimeAllowed: (status) => {
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const totalMinutes = hour * 60 + min;

        if (status === 'Clock In') {
            const start = CONFIG.TIME.CLOCK_IN_START_HOUR * 60 + (CONFIG.TIME.CLOCK_IN_START_MIN || 0);
            const end = CONFIG.TIME.CLOCK_IN_END_HOUR * 60 + (CONFIG.TIME.CLOCK_IN_END_MIN || 0);
            return totalMinutes >= start && totalMinutes < end;
        } else if (status === 'Clock Out') {
            const start = CONFIG.TIME.CLOCK_OUT_START * 60;
            const end = CONFIG.TIME.CLOCK_OUT_END * 60;
            return totalMinutes >= start && totalMinutes < end;
        }
        return false;
    },
};
