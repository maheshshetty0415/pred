const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/predectiva');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Seed default admin
        const User = require('../models/User');
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            await User.create({
                fullname: 'System Admin',
                email: 'admin@predectiva.com',
                password: 'admin123',
                role: 'admin',
                isVerified: true
            });
            console.log('Default Admin user seeded (admin@predectiva.com / admin123)');
        }
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        console.warn('CRITICAL WARNING: Express server remains online, but database operations will fail until MongoDB is connected.');
    }
};

module.exports = connectDB;
