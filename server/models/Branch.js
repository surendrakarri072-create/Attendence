const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    radius: {
        type: Number,
        default: 100 // Default 100 meters
    },
    authorizedIPRanges: [{
        type: String // CIDR format
    }],
    status: {
        type: String,
        enum: ['Active', 'Maintenance', 'Offline'],
        default: 'Active'
    },
    isMainHQ: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
