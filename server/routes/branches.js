const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/branches
... (rest of GET logic)
*/
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find();
        res.json({ success: true, branches });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch branches' });
    }
});

/**
 * POST /api/branches
 * Add new location
 */
router.post('/', async (req, res) => {
    try {
        const branch = await Branch.create(req.body);

        await AuditLog.create({
            action: 'BRANCH_CREATED',
            performedBy: req.body.adminId, // Should be passed from frontend
            targetType: 'Branch',
            targetId: branch._id,
            details: { name: branch.name, coordinates: branch.coordinates },
            severity: 'Medium'
        });

        res.json({ success: true, branch });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to create branch' });
    }
});

/**
 * PUT /api/branches/:id
 * Update branch settings
 */
router.put('/:id', async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });

        await AuditLog.create({
            action: 'BRANCH_UPDATED',
            performedBy: req.body.adminId,
            targetType: 'Branch',
            targetId: branch._id,
            details: { name: branch.name, status: branch.status },
            severity: 'Medium'
        });

        res.json({ success: true, branch });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update branch' });
    }
});

/**
 * DELETE /api/branches/:id
 * Remove branch location
 */
router.delete('/:id', async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (branch) {
            await AuditLog.create({
                action: 'BRANCH_DELETED',
                performedBy: req.query.adminId,
                targetType: 'Branch',
                targetId: req.params.id,
                details: { name: branch.name },
                severity: 'High'
            });
            await Branch.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true, message: 'Branch deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete branch' });
    }
});

module.exports = router;
