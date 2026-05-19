const mongoose = require('mongoose');
const { encryptData, decryptData } = require('../utils/encryption');

const HealthDataSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Encrypted fields
    age: { type: String, set: encryptData, get: decryptData },
    gender: { type: String, set: encryptData, get: decryptData },
    height: { type: String, set: encryptData, get: decryptData },
    weight: { type: String, set: encryptData, get: decryptData },
    sleep: { type: String, set: encryptData, get: decryptData },
    water: { type: String, set: encryptData, get: decryptData },
    exercise: { type: String, set: encryptData, get: decryptData },
    smoking: { type: String, set: encryptData, get: decryptData },
    alcohol: { type: String, set: encryptData, get: decryptData },
    diabetes: { type: String, set: encryptData, get: decryptData },
    heart: { type: String, set: encryptData, get: decryptData },
    bp: { type: String, set: encryptData, get: decryptData },
    fileUrl: { type: String } // For medical file uploads if any
}, { 
    timestamps: true,
    toJSON: { getters: true }, // Ensure getters are called when converting to JSON
    toObject: { getters: true }
});

module.exports = mongoose.model('HealthData', HealthDataSchema);
