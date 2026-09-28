const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

/**
 * Generate an admin JWT containing the admin id, email, name and role
 */
function generateToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    },
    process.env.JWT_SECRET || 'fleetlink_admin_secret_key',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

class AdminAuthController {
  /**
   * POST /api/admin/login
   * Only users with role='admin' can sign in here
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.'
        });
      }

      const user = await UserModel.findByEmail(email.trim().toLowerCase());

      if (!user || !user.password_hash) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await bcrypt.compare(password.trim(), user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Role is checked after the password so a wrong-role account cannot be probed
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'This account does not have administrator access.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Admin login successful.',
        token: generateToken(user),
        admin: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/me
   * Current signed-in administrator
   */
  static async getMe(req, res, next) {
    try {
      const admin = await UserModel.findById(req.admin.id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrator account not found.'
        });
      }

      return res.status(200).json({
        success: true,
        admin
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminAuthController;
