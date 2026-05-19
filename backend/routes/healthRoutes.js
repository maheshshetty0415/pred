const express = require('express');
const router = express.Router();
const { saveHealthData, getHealthData, getHealthDataByUser } = require('../controllers/healthController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, saveHealthData)
    .get(protect, getHealthData);

router.route('/:userId')
    .get(protect, authorize('admin', 'super_admin'), getHealthDataByUser);

module.exports = router;
