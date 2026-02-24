const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rollNumber: {
        type: String,
        required: true
    },
    date: {
        type: String, // Store as YYYY-MM-DD for easier queries
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['Clock In', 'Clock Out', 'Present', 'Absent', 'Late'],
        default: 'Present'
    },
    ipUsed: {
        type: String,
        default: 'Unknown'
    },
    latitude: Number,
    longitude: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Remove unique constraint to allow Clock In and Clock Out on the same day
attendanceSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
