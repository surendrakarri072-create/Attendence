


const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const StudentIP = require('../models/StudentIP');
const AuditLog = require('../models/AuditLog');
const { getClientIP } = require('../utils/ipUtils');

/**
 * POST /api/attendance/mark
 * Mark attendance with IP validation
 */
router.post('/mark', async (req, res) => {
    try {
        const { rollNumber } = req.body;
        const clientIP = getClientIP(req);

        console.log(`[Attendance] ${rollNumber} from IP: ${clientIP}`);

        if (!rollNumber) {
            return res.json({
                success: false,
                error: 'Roll number required'
            });
        }

        // 1. Find student
        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.json({
                success: false,
                error: 'STUDENT_NOT_FOUND',
                message: 'Student not found'
            });
        }

        // 2. Check IP status
        if (!student.ipStatus) {
            return res.json({
                success: false,
                error: 'NO_IP_REGISTERED',
                message: 'Your system IP is not registered. Contact admin.',
                currentIp: clientIP
            });
        }

        // 3. Get all active IPs
        const activeIPs = await StudentIP.find({
            studentId: student._id,
            isActive: true
        });

        if (activeIPs.length === 0) {
            return res.json({
                success: false,
                error: 'NO_ACTIVE_IP',
                message: 'No active IP addresses found. Contact admin.',
                currentIp: clientIP
            });
        }

        // 4. Check if current IP matches
        const registeredIPs = activeIPs.map(ip => ip.ipAddress);
        const ipMatch = activeIPs.some(ip => ip.ipAddress === clientIP);

        if (!ipMatch) {
            console.log(`[Attendance] IP mismatch - Current: ${clientIP}, Registered: ${registeredIPs.join(', ')}`);

            // Audit Log Failure
            await AuditLog.create({
                action: 'ATTENDANCE_FAILED_IP',
                performedBy: student._id,
                targetType: 'Attendance',
                ipAddress: clientIP,
                details: { rollNumber: student.rollNumber, attemptedIp: clientIP },
                severity: 'Medium'
            });

            return res.json({
                success: false,
                error: 'UNAUTHORIZED_IP',
                message: 'Attendance not allowed from this IP address.',
                currentIp: clientIP,
                registeredIps: registeredIPs
            });
        }

        // 5. HYBRID: Geolocation Distance Check (Server-Side)
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.json({
                success: false,
                error: 'LOCATION_REQUIRED',
                message: 'Geolocation data (latitude and longitude) is required to mark attendance.'
            });
        }

        // Validate types
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.json({
                success: false,
                error: 'INVALID_COORDINATES',
                message: 'Received invalid geolocation coordinates.'
            });
        }

        // Validate coordinates exist
        const OFFICE_LAT = 17.022628;
        const OFFICE_LONG = 82.239012;
        const ALLOWED_RADIUS = 500; // meters

        // Haversine Formula
        const R = 6371e3; // metres
        const φ1 = latitude * Math.PI / 180;
        const φ2 = OFFICE_LAT * Math.PI / 180;
        const Δφ = (OFFICE_LAT - latitude) * Math.PI / 180;
        const Δλ = (OFFICE_LONG - longitude) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        console.log(`[Attendance] Distance check: ${distance.toFixed(2)}m (Allowed: ${ALLOWED_RADIUS}m)`);

        if (distance > ALLOWED_RADIUS) {
            console.log(`[Attendance] Distance check FAILED: ${distance.toFixed(2)}m (Allowed: ${ALLOWED_RADIUS}m)`);

            // Audit Log Violation
            await AuditLog.create({
                action: 'ATTENDANCE_FAILED_GEO',
                performedBy: student._id,
                targetType: 'Attendance',
                ipAddress: clientIP,
                details: { rollNumber: student.rollNumber, distance, coords: [latitude, longitude] },
                severity: 'High'
            });

            return res.json({
                success: false,
                error: 'OUTSIDE_PREMISES',
                message: `You are ${Math.round(distance)}m away from office! Must be within ${ALLOWED_RADIUS}m.`,
                distance: distance
            });
        }

        // 6. Create attendance record
        const { status = 'Present' } = req.body;
        const today = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];

        const attendance = await Attendance.create({
            studentId: student._id,
            rollNumber: student.rollNumber,
            date: today,
            status: status,
            ipUsed: clientIP,
            latitude: latitude,
            longitude: longitude,
            timestamp: new Date()
        });

        // Audit Log Success
        await AuditLog.create({
            action: 'ATTENDANCE_MARKED',
            performedBy: student._id,
            targetType: 'Attendance',
            targetId: attendance._id,
            ipAddress: clientIP,
            details: { rollNumber: student.rollNumber, zone: 'Main HQ' },
            severity: 'Low'
        });

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            attendance: {
                date: attendance.date,
                time: attendance.timestamp,
                ipUsed: attendance.ipUsed,
                status: attendance.status
            }
        });

    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'Failed to mark attendance'
        });
    }
});

/**
 * POST /api/attendance/check-ip
 * Verify if current network is authorized for this student
 */
router.post('/check-ip', async (req, res) => {
    try {
        const { rollNumber } = req.body;
        const clientIP = getClientIP(req);

        if (!rollNumber) {
            return res.json({ success: false, error: 'Roll number required' });
        }

        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.json({ success: false, error: 'STUDENT_NOT_FOUND', message: 'Student not found' });
        }

        const activeIPs = await StudentIP.find({
            studentId: student._id,
            isActive: true
        });

        const ipAuthorized = activeIPs.some(ip => ip.ipAddress === clientIP);

        res.json({
            success: true,
            ipAuthorized: ipAuthorized,
            currentIp: clientIP,
            registeredIps: activeIPs.map(ip => ip.ipAddress)
        });

    } catch (error) {
        console.error('Check IP error:', error);
        res.status(500).json({ success: false, error: 'Check IP Failed' });
    }
});

/**
 * GET /api/attendance
 * Get attendance records with filters (supports rollNumber query)
 */
router.get('/', async (req, res) => {
    try {
        const { rollNumber, date, status } = req.query;
        let query = {};

        if (rollNumber) {
            query.rollNumber = rollNumber.toUpperCase();
        }
        if (date) {
            query.date = date;
        }
        if (status) {
            query.status = status;
        }

        const records = await Attendance.find(query)
            .sort({ timestamp: -1 })
            .limit(100);

        res.json(records.map(r => ({
            rollNumber: r.rollNumber,
            date: r.date,
            status: r.status,
            ipUsed: r.ipUsed,
            timestamp: r.timestamp,
            latitude: r.latitude,
            longitude: r.longitude
        })));

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, error: 'Failed' });
    }
});

/**
 * GET /api/attendance/history/:rollNumber
 * Get attendance history for a student
 */
router.get('/history/:rollNumber', async (req, res) => {
    try {
        const { rollNumber } = req.params;

        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        const records = await Attendance.find({ studentId: student._id })
            .sort({ date: -1, timestamp: -1 })
            .limit(30); // Last 30 records

        res.json({
            success: true,
            records: records.map(r => ({
                date: r.date,
                status: r.status,
                ipUsed: r.ipUsed,
                timestamp: r.timestamp
            }))
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch history'
        });
    }
});

/**
 * GET /api/attendance/all
 * Get all attendance records (Admin only)
 */
router.get('/all', async (req, res) => {
    try {
        const { date, rollNumber } = req.query;
        let query = {};

        if (date) {
            query.date = date;
        }
        if (rollNumber) {
            query.rollNumber = rollNumber.toUpperCase();
        }

        const records = await Attendance.find(query)
            .populate('studentId', 'name department')
            .sort({ date: -1, timestamp: -1 })
            .limit(100);

        res.json({
            success: true,
            records: records.map(r => ({
                rollNumber: r.rollNumber,
                name: r.studentId?.name || 'Unknown',
                department: r.studentId?.department || 'N/A',
                date: r.date,
                status: r.status,
                ipUsed: r.ipUsed,
                timestamp: r.timestamp
            }))
        });

    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attendance records'
        });
    }
});

/**
 * GET /api/attendance/stats
 * Get attendance statistics (Admin only)
 */
router.get('/stats', async (req, res) => {
    try {
        const today = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];

        // Unique students present today
        const uniquePresent = await Attendance.distinct('studentId', { date: today });
        const todayCount = uniquePresent.length;

        const totalStudents = await User.countDocuments();

        res.json({
            success: true,
            stats: {
                todayPresent: todayCount,
                totalStudents: totalStudents,
                todayAbsent: Math.max(0, totalStudents - todayCount),
                date: today
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

/**
 * GET /api/attendance/violations
 * Get attendance violations from audit logs
 */
router.get('/violations', async (req, res) => {
    try {
        const logs = await AuditLog.find({
            action: { $in: ['ATTENDANCE_FAILED_GEO', 'ATTENDANCE_FAILED_IP'] }
        })
            .populate('performedBy', 'name rollNumber')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(logs.map(log => ({
            rollNumber: log.performedBy?.rollNumber || log.details?.rollNumber || 'Unknown',
            timestamp: log.createdAt,
            latitude: log.details?.coords?.[0] || 0,
            longitude: log.details?.coords?.[1] || 0,
            distance: log.details?.distance || null,
            type: log.action === 'ATTENDANCE_FAILED_GEO' ? 'Geofence Breach' : 'IP Violation'
        })));
    } catch (error) {
        console.error('Get violations error:', error);
        res.status(500).json([]);
    }
});

module.exports = router;
