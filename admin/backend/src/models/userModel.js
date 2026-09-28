const { pool } = require('../config/db');

class UserModel {
  /**
   * Find a user by email (includes password_hash — only for the login flow)
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
   * Find a user by ID (never exposes password_hash)
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
}

module.exports = UserModel;
