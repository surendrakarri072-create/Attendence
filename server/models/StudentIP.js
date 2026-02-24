const mongoose = require('mongoose');

const studentIPSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    ipAddress: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                // Validate IPv4 format
                return /^(\d{1,3}\.){3}\d{1,3}$/.test(v) &&
                    v.split('.').every(num => parseInt(num) >= 0 && parseInt(num) <= 255);
            },
            message: props => `${props.value} is not a valid IP address!`
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate IPs for same student
studentIPSchema.index({ studentId: 1, ipAddress: 1 }, { unique: true });

// Update timestamp on save
studentIPSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('StudentIP', studentIPSchema);
