const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const jwt = require('jsonwebtoken');

// Helper to generate token and send cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token: token,
        role: user.role,
        email: user.email,
        fullname: user.fullname
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { fullname, email, password } = req.body;
        
        // Validation handled by mongoose
        const user = await User.create({ fullname, email, password });
        
        await SecurityLog.create({ user: user._id, action: 'LOGIN_SUCCESS', ipAddress: req.ip || '0.0.0.0', details: 'User Registered' });
        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.isLocked()) {
            await SecurityLog.create({ user: user._id, action: 'ACCOUNT_LOCKED', ipAddress: req.ip || '0.0.0.0', details: 'Attempted login to locked account' });
            return res.status(403).json({ success: false, message: 'Account is locked due to too many failed attempts' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
                await SecurityLog.create({ user: user._id, action: 'ACCOUNT_LOCKED', ipAddress: req.ip || '0.0.0.0', details: 'Account locked due to 5 failed attempts' });
            } else {
                await SecurityLog.create({ user: user._id, action: 'LOGIN_FAILED', ipAddress: req.ip || '0.0.0.0', details: `Failed attempt ${user.loginAttempts}` });
            }
            await user.save({ validateBeforeSave: false });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save({ validateBeforeSave: false });

        await SecurityLog.create({ user: user._id, action: 'LOGIN_SUCCESS', ipAddress: req.ip || '0.0.0.0', details: 'Successful login' });
        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ success: true, data: {} });
};
