require('dotenv').config();
try {
    require('dns').setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
    console.warn("Custom DNS server setting skipped in this environment:", e.message);
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Connect to MongoDB
connectDB();

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false
}));

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080'
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 2000, // Developer-friendly higher limit to prevent lockouts during testing
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Express 5 query mutation compatibility hack (fixes xss-clean / mongo-sanitize getter errors)
app.use((req, res, next) => {
    if (req.query) {
        Object.defineProperty(req, 'query', {
            value: { ...req.query },
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }
    next();
});

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Database connection verification middleware
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1 && req.path.startsWith('/api')) {
        return res.status(503).json({
            success: false,
            message: 'Database Offline: The secure health database is currently unreachable. Please make sure your local MongoDB service is running, or check the MONGO_URI value in your .env file.'
        });
    }
    next();
});

// Static folder (serve the frontend files)
app.use(express.static(path.join(__dirname, '../')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Fallback to index.html for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
