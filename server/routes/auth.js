const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Helper: Log request details for debugging
function logRequest(req, endpoint) {
    const device = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[${endpoint}] IP: ${ip}, Device: ${device.substring(0, 100)}`);
}

// Admin Login
router.post('/admin/login', [
    // Validation and sanitization middleware
    body('username')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Username must be 1-50 characters')
        .isAlphanumeric().withMessage('Username must be alphanumeric')
        .escape(), // Prevents XSS by escaping HTML characters
    body('password')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Password must be 1-100 characters')
        .escape()
], (req, res) => {
    logRequest(req, 'Admin Login');

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input',
            errors: errors.array()
        });
    }

    const { username, password } = req.body;

    // Fixed credentials as per requirements
    if (username === 'admin' && password === 'Ksdkt@006') {
        res.json({ success: true, token: 'admin-mock-token', role: 'admin' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
    }
});

// User Login
router.post('/user/login', [
    // Validation and sanitization middleware
    body('rollNumber')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Roll number must be 1-50 characters')
        .matches(/^[a-zA-Z0-9-]+$/).withMessage('Roll number must contain only letters, numbers, and hyphens')
        .escape(), // Prevents XSS
    body('password')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Password must be 1-100 characters')
        .escape()
], async (req, res) => {
    logRequest(req, 'User Login');

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input format',
                errors: errors.array()
            });
        }

        const { rollNumber, password } = req.body;

        // Handle proxies correctly
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;

        // 1. Check against Database
        const user = await User.findOne({ rollNumber });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2. Validate Password
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid Password' });
        }

        // 3. STRICT IP VALIDATION - BLOCK LOGIN IF INVALID
        // Only enforce if the user has IPs registered (if ipStatus is true)
        // Or enforce for everyone if that's the policy. 
        // Based on user request "if the ip address is not correct then it is not allowed to login"

        // Find active IPs for this student
        const StudentIP = require('../models/StudentIP');
        const activeIPs = await StudentIP.find({
            studentId: user._id,
            isActive: true
        });

        // Loophole: If student has NO IPs registered, should we allow them to login to see "No IP"?
        // User said: "if the ip address is not correct then it is not allowed to login"
        // This implies if they try to login from WRONG IP.
        // If they have NO IPs, they can't have a "correct" IP.
        // But they need to be able to tell admin "My IP is X".
        // If we block login, they can't see their IP on dashboard.
        // Compromise: We return a specific error code so frontend can show "Unauthorized IP: X.X.X.X" alert.

        const ipMatch = activeIPs.some(ip => ip.ipAddress === clientIP);

        if (activeIPs.length > 0 && !ipMatch) {
            // They have registered IPs, but this one isn't one of them. STRICT BLOCK.
            return res.status(403).json({
                success: false,
                message: 'Unauthorized System! Login denied.',
                error: 'UNAUTHORIZED_IP',
                currentIp: clientIP
            });
        }

        // If activeIPs.length === 0, it means "IP Not Registered".
        // We will allow login but Dashboard will show "IP Not Registered" and disable buttons.
        // IF the user wants *absolutely no login* even for first time setup, we would block here too.
        // But usually, you need to login to see you need to register.
        // However, the prompt says "show alert msg".
        if (activeIPs.length === 0) {
            // Let's block this too as per "not allowed to login" strict request
            return res.status(403).json({
                success: false,
                message: 'Your IP is not registered. Contact Admin.',
                error: 'NO_IP_REGISTERED',
                currentIp: clientIP
            });
        }

        res.json({
            success: true,
            user: {
                rollNumber: user.rollNumber,
                name: user.name,
                department: user.department,
                ipStatus: true // Since we passed the check
            }
        });

    } catch (err) {
        console.error('User Login Error:', err);
        res.status(500).json({
            success: false,
            message: 'A server error occurred during login. Please try again later.',
            error: 'SERVER_ERROR'
        });
    }
});

module.exports = router;
