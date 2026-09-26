const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected profile route
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;
