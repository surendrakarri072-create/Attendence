const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * POST /api/notifications/broadcast
 * Admin sends a notification
 */
router.post('/broadcast', async (req, res) => {
    try {
        const { title, message, priority, targetAudience, targetRollNumbers, senderId } = req.body;

        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(senderId);

        const notification = await Notification.create({
            title,
            message,
            priority,
            targetAudience,
            targetRollNumbers,
            sender: isObjectId ? senderId : null
        });

        // Audit Log
        await AuditLog.create({
            action: 'BROADCAST_SENT',
            performedBy: senderId === 'admin' ? null : senderId, // Admin ID if available
            targetType: 'System',
            details: { title, priority, targetAudience },
            severity: priority === 'Urgent' ? 'High' : 'Low'
        });

        res.json({ success: true, message: 'Notification broadcasted', notification });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to broadcast' });
    }
});

/**
 * GET /api/notifications/student/:rollNumber
 * Student fetches notifications relevant to them
 */
router.get('/student/:rollNumber', async (req, res) => {
    try {
        const { rollNumber } = req.params;
        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });

        if (!student) return res.status(404).json({ success: false, message: 'User not found' });

        const notifications = await Notification.find({
            $or: [
                { targetAudience: 'All' },
                { targetRollNumbers: rollNumber.toUpperCase() },
                { targetDepartment: student.department } // If we add department to User model
            ]
        }).sort({ createdAt: -1 });

        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/all
 * Admin fetches all notifications for history
 */
router.get('/all', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * PUT /api/notifications/read/:notificationId
 * Mark notification as read
 */
router.put('/read/:notificationId', async (req, res) => {
    try {
        const { userId } = req.body;
        await Notification.findByIdAndUpdate(req.params.notificationId, {
            $addToSet: { readBy: { user: userId, readAt: new Date() } }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
});

module.exports = router;
