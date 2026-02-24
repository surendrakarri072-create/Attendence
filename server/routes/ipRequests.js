const express = require('express');
const router = express.Router();
const IPRequest = require('../models/IPRequest');
const User = require('../models/User');
const StudentIP = require('../models/StudentIP');
const AuditLog = require('../models/AuditLog');

/**
 * POST /api/ip-requests/submit
 * Student submits a new IP registration request
 */
router.post('/submit', async (req, res) => {
    try {
        const { rollNumber, ipAddress, justification, systemIdentifier, connectionType, locationMetadata } = req.body;

        if (!rollNumber || !ipAddress || !justification || !systemIdentifier) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const student = await User.findOne({ rollNumber: rollNumber.toUpperCase() });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const newRequest = await IPRequest.create({
            student: student._id,
            rollNumber: student.rollNumber,
            ipAddress,
            justification,
            systemIdentifier,
            connectionType,
            locationMetadata,
            status: 'Pending'
        });

        // Log the action
        await AuditLog.create({
            action: 'IP_REQUEST_SUBMITTED',
            performedBy: student._id,
            targetType: 'IPRequest',
            targetId: newRequest._id,
            ipAddress: req.ip,
            details: { ipAddressRequested: ipAddress }
        });

        res.json({ success: true, message: 'Request submitted successfully', request: newRequest });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to submit request' });
    }
});

/**
 * GET /api/ip-requests/my-requests/:rollNumber
 * Student fetches their own requests
 */
router.get('/my-requests/:rollNumber', async (req, res) => {
    try {
        const requests = await IPRequest.find({ rollNumber: req.params.rollNumber.toUpperCase() })
            .sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * GET /api/ip-requests/all
 * Admin fetches all pending/recent requests with conflict detection
 */
router.get('/all', async (req, res) => {
    try {
        const requests = await IPRequest.find()
            .populate('student', 'name rollNumber')
            .sort({ createdAt: -1 })
            .lean();

        // Phase 2: Conflict Detection Logic
        const processedRequests = await Promise.all(requests.map(async (reqst) => {
            const auditResults = {
                vpnDetected: false, // In a real app, integrate an IP Intelligence API
                conflictCount: 0,
                existingUsers: []
            };

            // Check if this IP is already owned by other students
            const otherAuthorized = await StudentIP.find({
                ipAddress: reqst.ipAddress,
                studentId: { $ne: reqst.student._id }
            }).populate('studentId', 'rollNumber name');

            // Check if other PENDING requests exist for this IP
            const pendingConflicts = await IPRequest.countDocuments({
                ipAddress: reqst.ipAddress,
                _id: { $ne: reqst._id },
                status: 'Pending'
            });

            auditResults.conflictCount = otherAuthorized.length + pendingConflicts;
            auditResults.existingUsers = otherAuthorized.map(a => a.studentId?.rollNumber).filter(Boolean);

            return {
                ...reqst,
                auditResults
            };
        }));

        res.json({ success: true, requests: processedRequests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * PUT /api/ip-requests/review/:requestId
 * Admin reviews a request
 */
router.put('/review/:requestId', async (req, res) => {
    try {
        const { status, adminComment, adminId } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const request = await IPRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = status;
        request.adminComment = adminComment;

        // Handle mock 'admin' ID gracefully to avoid Mongoose CastError
        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(adminId);
        request.reviewedBy = isObjectId ? adminId : null;

        request.reviewedAt = new Date();
        await request.save();

        if (status === 'Approved') {
            // Add the IP to authorized list
            await StudentIP.create({
                studentId: request.student,
                ipAddress: request.ipAddress,
                isActive: true
            });

            // Mark student as having IP authorized
            await User.findByIdAndUpdate(request.student, { ipStatus: true });
        }

        // Log the action
        await AuditLog.create({
            action: status === 'Approved' ? 'IP_REQUEST_APPROVED' : 'IP_REQUEST_REJECTED',
            performedBy: isObjectId ? adminId : null,
            targetType: 'IPRequest',
            targetId: request._id,
            details: { rollNumber: request.rollNumber, ipAddress: request.ipAddress }
        });

        res.json({ success: true, message: `Request ${status} successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
