const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'DATA_ACCESSED', 'ADMIN_ACTION', 'MALICIOUS_ACTIVITY']
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: String,
    details: String,
}, { timestamps: true });

// Index for fast querying in admin dashboard
SecurityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
