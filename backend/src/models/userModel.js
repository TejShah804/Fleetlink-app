const { pool } = require('../config/db');

class UserModel {
  /**
   * Find a user by email
   */
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, phone_number, company_name, role, message, created_at FROM users WHERE email = ?',
      [email]
    );
    if (!rows[0]) return null;
    const user = rows[0];
    return { ...user, phone: user.phone_number };
  }

  /**
   * Find a user by ID (excludes password_hash by default)
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone_number, company_name, role, message, created_at FROM users WHERE id = ?',
      [id]
    );
    if (!rows[0]) return null;
    const user = rows[0];
    return { ...user, phone: user.phone_number };
  }

  /**
   * Create a full user account (owner_driver or fleet_operator)
   */
  static async createAccount({ name, email, password_hash, phone_number, phone, company_name = null, message = null, role }) {
    const actualPhone = phone_number || phone;
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, phone_number, company_name, role, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, actualPhone, company_name, role, message]
    );
    return {
      id: result.insertId,
      name,
      email,
      phone_number: actualPhone,
      phone: actualPhone,
      company_name,
      role,
      message
    };
  }

  /**
   * Save any registration as a lead (no login required at registration stage)
   * Role can be 'owner_driver', 'fleet_operator', or 'other'
   * password_hash is optional — provided only when admin sets up account manually
   */
  static async createLead({ name, email, phone_number, phone, company_name = null, message = null, role = 'other', password_hash = null }) {
    const actualPhone = phone_number || phone;
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, phone_number, company_name, role, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, actualPhone, company_name, role, message]
    );
    return {
      id: result.insertId,
      name,
      email,
      phone_number: actualPhone,
      phone: actualPhone,
      company_name,
      role,
      message
    };
  }
}

module.exports = UserModel;
