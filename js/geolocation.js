/**
 * Attendance Management System - Geolocation Service
 * Handles location retrieval and distance calculation
 */

const Geolocation = {
    // Error Codes
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,

    /**
     * Get device specific info for better error messages
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let os = 'Unknown';

        if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (ua.indexOf("Safari") !== -1) browser = "Safari";
        else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

        if (ua.indexOf("Android") !== -1) os = "Android";
        else if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) os = "iOS";
        else if (ua.indexOf("Windows") !== -1) os = "Desktop";

        return { browser, isMobile: (os === 'Android' || os === 'iOS'), os };
    },

    /**
     * Check if context is secure (HTTPS)
     * Required for Geolocation on mobile
     */
    isSecureContext() {
        return window.isSecureContext ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    },

    /**
     * Get help message based on error code and device
     */
    getDeviceSpecificHelp(errorCode) {
        const device = this.getDeviceInfo();
        let help = '';

        switch (errorCode) {
            case this.PERMISSION_DENIED:
                if (device.os === 'iOS') {
                    help = '1. Open Settings > Privacy > Location Services (ON). 2. Scroll down to Safari > "While Using the App". 3. Refresh this page.';
                } else if (device.os === 'Android') {
                    help = '1. Tap the Lock/Settings icon in the address bar. 2. Tap Permissions > Location > Allow. 3. Ensure "Location" is ON in your Android swipe-down menu.';
                } else {
                    // For Windows/Mac (Desktop)
                    help = '1. Click the Lock icon in browser bar > Allow Location. 2. Windows Settings > Privacy > Location > "Allow apps to access your location" (Must be ON).';
                }
                break;
            case this.POSITION_UNAVAILABLE:
                help = 'We cannot get a clear GPS signal. If indoors, try moving near a window or ensuring Wi-Fi is turned ON (even if not connected) to help with accuracy.';
                break;
            case this.TIMEOUT:
                help = 'Location request timed out. Please refresh and ensure your device has a clear view of the sky or is connected to Wi-Fi.';
                break;
        }
        return help;
    },

    /**
     * Calculate distance between two coordinates in meters (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },

    /**
     * Get current position with promise wrapper and device-specific error handling
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const device = this.getDeviceInfo();
                reject(new Error(
                    `Geolocation is not supported by your browser (${device.browser} on ${device.os}).`
                ));
                return;
            }

            // Check HTTPS requirement for ALL devices (Chrome blocks Geo on HTTP desktop too)
            if (!this.isSecureContext()) {
                reject(new Error('🔒 SECURITY BLOCK: Location access is only allowed over SECURE (HTTPS) connections. If you are testing on a local network, please use a tunnel (like Ngrok) or access via a "https://" URL.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };

                    if (CONFIG.DEBUG_MODE) {
                        console.log('Location acquired:', coords);
                    }
                    resolve(coords);
                },
                (error) => {
                    // Get device-specific help message
                    const helpMessage = this.getDeviceSpecificHelp(error.code);
                    const device = this.getDeviceInfo();

                    // Always log the full error details for debugging
                    console.error('Geolocation error:', {
                        code: error.code,
                        message: error.message,
                        device: device,
                        isSecure: this.isSecureContext(),
                        protocol: window.location.protocol
                    });

                    let errorMessage = 'Location Error: ';

                    // Show the actual error message from the browser + help text
                    errorMessage += `${error.message || 'Unknown error'}. ${helpMessage}`;

                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: false, // Changed to false for faster response (still accurate enough)
                    timeout: 60000, // Increased to 60 seconds for slower devices
                    maximumAge: 10000 // Allow cached position up to 10 seconds old
                }
            );
        });
    },

    /**
     * Main function verify if user is within premises
     */
    async verifyLocation() {
        try {
            const current = await this.getCurrentPosition();

            const distance = this.calculateDistance(
                current.latitude,
                current.longitude,
                CONFIG.LOCATION.LATITUDE,
                CONFIG.LOCATION.LONGITUDE
            );

            // Check against allowed radius
            const isAllowed = distance <= CONFIG.LOCATION.ALLOWED_RADIUS_METERS;

            if (CONFIG.DEBUG_MODE) {
                console.log(`Distance: ${distance.toFixed(2)}m, Allowed: ${CONFIG.LOCATION.ALLOWED_RADIUS_METERS}m`);
            }

            return {
                success: true,
                allowed: isAllowed,
                distance: distance,
                current: current
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};
