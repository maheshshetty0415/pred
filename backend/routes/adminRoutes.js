const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser, getSecurityLogs, getDashboardStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here require admin or super_admin
router.use(protect);
router.use(authorize('admin', 'super_admin'));

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/logs', getSecurityLogs);
router.get('/stats', getDashboardStats);

module.exports = router;
