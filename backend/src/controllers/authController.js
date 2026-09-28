const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

/**
 * Generate a JWT token containing user id, email, name, and role
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET || 'fleetlink_secret_key',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

/**
 * Normalize role inputs to standard database enum values
 */
function normalizeRole(role) {
  if (!role) return null;
  const r = role.toString().trim().toLowerCase();
  if (r === 'driver' || r === 'owner_driver') return 'owner_driver';
  if (r === 'operator' || r === 'fleet_operator') return 'fleet_operator';
  if (r === 'other') return 'other';
  return null;
}

class AuthController {
  /**
   * POST /api/auth/register
   * Handles user registration & lead capture
   */
  static async register(req, res, next) {
    try {
      const { name, email, phone, phone_number, company_name, message, password, role } = req.body;
      const actualPhone = phone_number || phone;

      // 1. Validate basic required fields
      if (!name || !email || !actualPhone || !role) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, phone number, and role are required fields.'
        });
      }

      // 2. Validate Indian mobile number (10 digits, starts 6-9)
      const trimmedPhone = String(actualPhone).trim();
      if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian mobile number.'
        });
      }

      // 3. Validate & normalize role
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Role must be 'owner_driver', 'fleet_operator', or 'other'."
        });
      }

      // 4. Check for existing user by email
      const existingUser = await UserModel.findByEmail(email.trim().toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account or lead with this email address already exists.'
        });
      }

      // 5. ALL roles → interest/lead capture only (no password on Register Interest form)
      // Password is optional — if provided, hash it; if not, save without password_hash
      let password_hash = null;
      if (password && password.trim().length >= 6) {
        const saltRounds = 10;
        password_hash = await bcrypt.hash(password.trim(), saltRounds);
      }

      const lead = await UserModel.createLead({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: trimmedPhone,
        company_name: company_name ? company_name.trim() : null,
        message: message ? message.trim() : null,
        role: normalizedRole,
        password_hash   // null if not provided
      });

      return res.status(201).json({
        success: true,
        message: 'Interest registered successfully! Our team will get in touch with you.',
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone_number: lead.phone_number,
          company_name: lead.company_name,
          role: lead.role,
          message: lead.message
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user credentials and return JWT
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
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Block 'other' role from login access
      if (user.role === 'other' || !user.password_hash) {
        return res.status(403).json({
          success: false,
          message: "Registration under role 'other' is for lead capture only. No dashboard or login access is granted."
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password.trim(), user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Administrators use the admin panel, which is served by a separate API that
      // signs tokens with a different secret. Verify the credentials here so admins
      // can use this one sign-in form, but do NOT mint a public API token — the
      // client completes the hand-off against the admin API instead.
      if (user.role === 'admin') {
        return res.status(200).json({
          success: true,
          message: 'Admin credentials verified.',
          adminSignIn: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            phone: user.phone_number,
            company_name: user.company_name,
            role: user.role,
            message: user.message
          }
        });
      }

      // Generate JWT
      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          phone: user.phone_number,
          company_name: user.company_name,
          role: user.role,
          message: user.message
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Retrieve current authenticated user profile
   */
  static async getMe(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      return res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
