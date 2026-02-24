const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StudentIP = require('../models/StudentIP');
const { isValidIPv4 } = require('../utils/ipUtils');

/**
 * GET /api/ip/student/:rollNumber
 * Get all IPs for a student (Admin only)
 */
router.get('/student/:rollNumber', async (req, res) => {
    try {
        const { rollNumber } = req.params;

        // Find student
        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Get all IPs for this student
        const ips = await StudentIP.find({ studentId: student._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            ips: ips.map(ip => ({
                id: ip._id,
                ipAddress: ip.ipAddress,
                isActive: ip.isActive,
                createdAt: ip.createdAt,
                updatedAt: ip.updatedAt
            }))
        });

    } catch (error) {
        console.error('Get IPs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch IPs'
        });
    }
});

/**
 * POST /api/ip/add
 * Add new IP address for a student (Admin only)
 */
router.post('/add', async (req, res) => {
    try {
        const { rollNumber, ipAddress } = req.body;

        // Validation
        if (!rollNumber || !ipAddress) {
            return res.json({
                success: false,
                error: 'Roll number and IP address are required'
            });
        }

        // Validate IP format
        if (!isValidIPv4(ipAddress.trim())) {
            return res.json({
                success: false,
                error: 'Invalid IP address format'
            });
        }

        // Find student
        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Check if IP already exists for this student
        const existingIP = await StudentIP.findOne({
            studentId: student._id,
            ipAddress: ipAddress.trim()
        });

        if (existingIP) {
            return res.json({
                success: false,
                error: 'This IP address is already registered for this student'
            });
        }

        // Create new IP entry
        const newIP = await StudentIP.create({
            studentId: student._id,
            ipAddress: ipAddress.trim(),
            isActive: true
        });

        // Update student's ipStatus to true
        await User.findByIdAndUpdate(student._id, { ipStatus: true });

        // Add Audit Log
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            action: 'MANUAL_IP_ADDITION',
            performedBy: null, // Would be req.user.id if auth middleware was active
            targetType: 'User',
            targetId: student.rollNumber,
            details: { ipAddress: ipAddress.trim() },
            severity: 'Medium',
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'IP address added successfully',
            ip: {
                id: newIP._id,
                ipAddress: newIP.ipAddress,
                isActive: newIP.isActive,
                createdAt: newIP.createdAt
            }
        });

    } catch (error) {
        console.error('Add IP error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add IP address'
        });
    }
});

/**
 * PUT /api/ip/toggle/:ipId
 * Toggle IP active status (Admin only)
 */
router.put('/toggle/:ipId', async (req, res) => {
    try {
        const { ipId } = req.params;

        // Find IP
        const ip = await StudentIP.findById(ipId);
        if (!ip) {
            return res.status(404).json({
                success: false,
                error: 'IP not found'
            });
        }

        // Toggle active status
        ip.isActive = !ip.isActive;
        await ip.save();

        // Check if student has any active IPs left
        const activeIPsCount = await StudentIP.countDocuments({
            studentId: ip.studentId,
            isActive: true
        });

        // Update student's ipStatus
        await User.findByIdAndUpdate(ip.studentId, {
            ipStatus: activeIPsCount > 0
        });

        res.json({
            success: true,
            message: `IP ${ip.isActive ? 'enabled' : 'disabled'}`,
            isActive: ip.isActive
        });

    } catch (error) {
        console.error('Toggle IP error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle IP status'
        });
    }
});

/**
 * DELETE /api/ip/remove/:ipId
 * Remove IP address (Admin only)
 */
router.delete('/remove/:ipId', async (req, res) => {
    try {
        const { ipId } = req.params;

        // Find and delete IP
        const ip = await StudentIP.findById(ipId);
        if (!ip) {
            return res.status(404).json({
                success: false,
                error: 'IP not found'
            });
        }

        const studentId = ip.studentId;
        await StudentIP.findByIdAndDelete(ipId);

        // Check if student has any IPs left
        const remainingIPsCount = await StudentIP.countDocuments({ studentId });

        // Update student's ipStatus
        await User.findByIdAndUpdate(studentId, {
            ipStatus: remainingIPsCount > 0
        });

        res.json({
            success: true,
            message: 'IP address removed successfully'
        });

    } catch (error) {
        console.error('Remove IP error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove IP address'
        });
    }
});

module.exports = router;
