/**
 * Utility to get client IP address
 * Handles proxies (Vercel, Render, etc.)
 */
function getClientIP(req) {
    // Check for forwarded IP (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, get the first one
        const ips = forwarded.split(',');
        return ips[0].trim();
    }

    // Check other common proxy headers
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP.trim();
    }

    // Fallback to direct connection IP
    return req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
        'Unknown';
}

/**
 * Validate IPv4 format
 */
function isValidIPv4(ip) {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(num => {
        const n = parseInt(num, 10);
        return n >= 0 && n <= 255;
    });
}

module.exports = {
    getClientIP,
    isValidIPv4
};
