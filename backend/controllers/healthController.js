const HealthData = require('../models/HealthData');
const SecurityLog = require('../models/SecurityLog');

// @desc    Save health data for current user
// @route   POST /api/health
// @access  Private
exports.saveHealthData = async (req, res, next) => {
    try {
        const existing = await HealthData.findOne({ user: req.user.id });

        if (existing) {
            // Update existing
            Object.assign(existing, req.body);
            await existing.save();
            return res.status(200).json({ success: true, data: existing });
        }

        const healthData = await HealthData.create({
            ...req.body,
            user: req.user.id
        });

        await SecurityLog.create({
            user: req.user.id,
            action: 'DATA_ACCESSED',
            ipAddress: req.ip || '0.0.0.0',
            details: 'Health data submitted'
        });

        res.status(201).json({ success: true, data: healthData });
    } catch (err) {
        next(err);
    }
};

// @desc    Get health data for current user
// @route   GET /api/health
// @access  Private
exports.getHealthData = async (req, res, next) => {
    try {
        const healthData = await HealthData.findOne({ user: req.user.id });
        if (!healthData) {
            return res.status(404).json({ success: false, message: 'No health data found' });
        }
        res.status(200).json({ success: true, data: healthData });
    } catch (err) {
        next(err);
    }
};

// @desc    Get health data for a specific user (admin only)
// @route   GET /api/health/:userId
// @access  Private/Admin
exports.getHealthDataByUser = async (req, res, next) => {
    try {
        const healthData = await HealthData.findOne({ user: req.params.userId }).populate('user');
        if (!healthData) {
            return res.status(404).json({ success: false, message: 'No health data found for this user' });
        }

        await SecurityLog.create({
            user: req.user.id,
            action: 'ADMIN_ACTION',
            ipAddress: req.ip || '0.0.0.0',
            details: `Admin viewed health data of user ${req.params.userId}`
        });

        res.status(200).json({ success: true, data: healthData });
    } catch (err) {
        next(err);
    }
};
