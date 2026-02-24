const mongoose = require('mongoose');

const ipRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rollNumber: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    justification: {
        type: String,
        required: true
    },
    systemIdentifier: {
        type: String, // e.g., "Home Laptop", "Work PC"
        required: true
    },
    connectionType: {
        type: String,
        enum: ['Residential', 'Office', 'Campus', 'Other'],
        default: 'Residential'
    },
    locationMetadata: {
        city: String,
        isp: String,
        country: String,
        asn: String
    },
    auditResults: {
        vpnDetected: { type: Boolean, default: false },
        torDetected: { type: Boolean, default: false },
        proxyDetected: { type: Boolean, default: false },
        blacklistClean: { type: Boolean, default: true }
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    adminComment: String,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('IPRequest', ipRequestSchema);
