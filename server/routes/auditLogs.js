const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/audit-logs
 * Fetch recent system logs (Admin only)
 */
router.get('/', async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('performedBy', 'name rollNumber')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});

module.exports = router;
