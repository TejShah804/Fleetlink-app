const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for MySQL
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
    return true;
  } catch (error) {
    console.error(`[DB Error] Unable to connect to MySQL database: ${error.message}`);
    console.error(`[DB Tip] Ensure MySQL is running and your .env credentials match (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
