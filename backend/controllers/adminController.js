const User = require('../models/User');
const HealthData = require('../models/HealthData');
const SecurityLog = require('../models/SecurityLog');

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('+password');

        // Attach health data status to each user
        const usersWithHealth = await Promise.all(users.map(async (u) => {
            const hd = await HealthData.findOne({ user: u._id });
            return {
                _id: u._id,
                fullname: u.fullname,
                email: u.email,
                password: u.password, // hashed — admin sees the hash, not plain
                role: u.role,
                isVerified: u.isVerified,
                loginAttempts: u.loginAttempts,
                lockUntil: u.lockUntil,
                hasHealthData: !!hd,
                healthData: hd || null,
                createdAt: u.createdAt
            };
        }));

        await SecurityLog.create({
            user: req.user.id,
            action: 'ADMIN_ACTION',
            ipAddress: req.ip || '0.0.0.0',
            details: 'Admin accessed all user data'
        });

        res.status(200).json({ success: true, count: usersWithHealth.length, data: usersWithHealth });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Delete associated health data
        await HealthData.deleteOne({ user: user._id });
        await User.deleteOne({ _id: user._id });

        await SecurityLog.create({
            user: req.user.id,
            action: 'ADMIN_ACTION',
            ipAddress: req.ip || '0.0.0.0',
            details: `Deleted user ${user.email}`
        });

        res.status(200).json({ success: true, message: 'User deleted' });
    } catch (err) {
        next(err);
    }
};

// @desc    Get security logs
// @route   GET /api/admin/logs
// @access  Private/Admin
exports.getSecurityLogs = async (req, res, next) => {
    try {
        const logs = await SecurityLog.find()
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('user', 'fullname email');

        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        next(err);
    }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalHealth = await HealthData.countDocuments();
        const totalLogs = await SecurityLog.countDocuments();
        const failedLogins = await SecurityLog.countDocuments({ action: 'LOGIN_FAILED' });
        const lockedAccounts = await User.countDocuments({ lockUntil: { $gt: Date.now() } });

        // Recent activity (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogins = await SecurityLog.countDocuments({ action: 'LOGIN_SUCCESS', createdAt: { $gte: oneDayAgo } });
        const recentFailed = await SecurityLog.countDocuments({ action: 'LOGIN_FAILED', createdAt: { $gte: oneDayAgo } });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalHealth,
                totalLogs,
                failedLogins,
                lockedAccounts,
                recentLogins,
                recentFailed,
                completionRate: totalUsers > 0 ? Math.round((totalHealth / totalUsers) * 100) : 0
            }
        });
    } catch (err) {
        next(err);
    }
};
