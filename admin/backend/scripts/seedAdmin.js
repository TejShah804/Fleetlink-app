const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../src/config/db');

/**
 * Creates (or resets) the administrator account used to sign in to the admin panel.
 * Credentials come from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_PHONE in .env
 *
 * Usage: npm run seed:admin
 */
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@fleetlink.com').trim().toLowerCase();
  const name = process.env.ADMIN_NAME || 'FleetLink Admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const phone = process.env.ADMIN_PHONE || '+91 90000 00000';

  if (password.length < 6) {
    console.error('[Seed] ADMIN_PASSWORD must be at least 6 characters long.');
    process.exit(1);
  }

  const connected = await testConnection();
  if (!connected) {
    console.error('[Seed] Cannot continue without a database connection.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [existing] = await pool.execute('SELECT id, role FROM users WHERE email = ?', [email]);

  if (existing.length > 0) {
    await pool.execute(
      `UPDATE users
       SET name = ?, password_hash = ?, phone_number = ?, role = 'admin'
       WHERE id = ?`,
      [name, password_hash, phone, existing[0].id]
    );
    console.log(`[Seed] Updated existing account ${email} and promoted it to role 'admin'.`);
  } else {
    await pool.execute(
      `INSERT INTO users (name, email, password_hash, phone_number, role)
       VALUES (?, ?, ?, ?, 'admin')`,
      [name, email, password_hash, phone]
    );
    console.log(`[Seed] Created admin account ${email}.`);
  }

  console.log('--------------------------------------------');
  console.log(` Admin email:    ${email}`);
  console.log(` Admin password: ${password}`);
  console.log(' Sign in at /admin on the frontend.');
  console.log('--------------------------------------------');

  await pool.end();
}

seedAdmin().catch((error) => {
  console.error('[Seed Error]', error.message);
  process.exit(1);
});
