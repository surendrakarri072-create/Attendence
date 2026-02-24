const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true // e.g., "IP_REQUEST_APPROVED", "USER_LOGIN_FAILURE"
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetType: {
        type: String,
        enum: ['User', 'IPRequest', 'Branch', 'System', 'Attendance'],
        required: true
    },
    targetId: {
        type: String
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low'
    },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
