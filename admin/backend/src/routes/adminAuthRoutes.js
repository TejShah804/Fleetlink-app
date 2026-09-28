const express = require('express');
const AdminAuthController = require('../controllers/adminAuthController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: exchange admin credentials for a token
router.post('/login', AdminAuthController.login);

// Protected: current administrator profile
router.get('/me', authenticateAdmin, requireAdmin, AdminAuthController.getMe);

module.exports = router;
