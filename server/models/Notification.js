const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Info', 'Warning', 'Urgent'],
        default: 'Info'
    },
    targetAudience: {
        type: String,
        enum: ['All', 'SpecificRolls', 'Department', 'PendingIPs'],
        default: 'All'
    },
    targetRollNumbers: [String],
    targetDepartment: String,
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],
    expiresAt: Date,
    isDraft: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
