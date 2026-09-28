const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for MySQL (read-mostly; same schema as the main backend)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fleetlink_db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true // Return DECIMAL as numbers instead of strings where appropriate
});

// Helper to test database connectivity at startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Successfully connected to MySQL database: ${process.env.DB_NAME || 'fleetlink_db'}`);
    connection.release();
    await ensureAdminRoleEnum();
    return true;
  } catch (error) {
    console.error(`[DB Error] Unable to connect to MySQL database: ${error.message}`);
    console.error(`[DB Tip] Ensure MySQL is running and your .env credentials match (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).`);
    return false;
  }
}

/**
 * The admin role lives in the same `users` table as every other account, so the
 * role ENUM has to accept 'admin'. Older databases were created from the original
 * schema.sql which only had three roles — widen the ENUM in place, idempotently.
 * All existing rows keep their value because the new value is appended last.
 */
async function ensureAdminRoleEnum() {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
      [process.env.DB_NAME || 'fleetlink_db']
    );

    const columnType = rows[0] && rows[0].COLUMN_TYPE;
    if (!columnType) {
      console.error('[DB] Could not read users.role column type. Run admin/backend/schema_admin.sql manually.');
      return;
    }

    if (columnType.includes("'admin'")) {
      console.log('[DB] users.role already accepts the admin role.');
      return;
    }

    await pool.query(
      "ALTER TABLE users MODIFY role ENUM('owner_driver', 'fleet_operator', 'other', 'admin') NOT NULL"
    );
    console.log("[DB] Widened users.role ENUM to include 'admin'.");
  } catch (error) {
    console.error(`[DB] Could not ensure the admin role ENUM: ${error.message}`);
  }
}

module.exports = {
  pool,
  testConnection
};
