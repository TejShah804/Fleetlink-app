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
    await ensureApplicationUniqueIndex();
    await ensureTripScheduleColumns();
    await ensureTripLifecycleSchema();
    return true;
  } catch (error) {
    console.error(`[DB Error] Unable to connect to MySQL database: ${error.message}`);
    console.error(`[DB Tip] Ensure MySQL is running and your .env credentials match (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).`);
    return false;
  }
}

/** Column names present on `table`, lowercased-safe, from information_schema. */
async function columnsOf(table) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

/** True if `table` exists in the current schema. */
async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
}

/** True if an index named `name` exists on `table`. */
async function indexExists(table, name) {
  const [rows] = await pool.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, name]);
  return rows.length > 0;
}

/** True if a foreign key constraint named `name` exists on `table`. */
async function constraintExists(table, name) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?`,
    [table, name]
  );
  return rows.length > 0;
}

/**
 * Allow many drivers to apply to the same trip.
 * Older DBs sometimes had UNIQUE(trip_id), which overwrote/blocked the 2nd applicant.
 */
async function ensureApplicationUniqueIndex() {
  try {
    const [indexes] = await pool.query('SHOW INDEX FROM applications');
    const uniqueByName = {};

    for (const idx of indexes) {
      if (idx.Non_unique !== 0 || idx.Key_name === 'PRIMARY') continue;
      if (!uniqueByName[idx.Key_name]) uniqueByName[idx.Key_name] = [];
      uniqueByName[idx.Key_name].push(idx.Column_name);
    }

    let hasTripDriverUnique = false;

    for (const [name, columns] of Object.entries(uniqueByName)) {
      const joined = columns.join(',');
      if (joined === 'trip_id,owner_driver_id' || joined === 'owner_driver_id,trip_id') {
        hasTripDriverUnique = true;
        continue;
      }
      if (columns.length === 1 && columns[0] === 'trip_id') {
        await pool.query(`ALTER TABLE applications DROP INDEX \`${name}\``);
        console.log(`[DB] Dropped unique index ${name} on applications.trip_id so multiple drivers can apply to one trip.`);
      }
    }

    if (!hasTripDriverUnique) {
      await pool.query(
        'ALTER TABLE applications ADD UNIQUE KEY uq_trip_driver (trip_id, owner_driver_id)'
      );
      console.log('[DB] Added unique key uq_trip_driver (trip_id, owner_driver_id).');
    }
  } catch (error) {
    console.error(`[DB] Could not verify applications unique index: ${error.message}`);
  }
}

/**
 * Add the India-localisation columns to `trips` (pickup/delivery schedule,
 * payment method, notes).
 *
 * New columns are added nullable, existing rows are backfilled, and only then
 * are they tightened to NOT NULL — MySQL cannot add a NOT NULL column to a
 * table that already has rows. Idempotent: re-running is a no-op.
 * The canonical SQL for this lives in backend/migrate_india_trips.sql.
 */
async function ensureTripScheduleColumns() {
  const ADDABLE = [
    ['pickup_date', 'DATE NULL'],
    ['pickup_time', 'TIME NULL'],
    ['delivery_date', 'DATE NULL'],
    ['payment_method', "ENUM('online', 'cash', 'net_banking', 'bank_transfer') NULL"],
    ['notes', 'TEXT NULL']
  ];

  try {
    const [existing] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trips'`
    );

    // Table not created yet — schema.sql will make it correctly on first run
    if (existing.length === 0) return;

    const present = new Set(existing.map((row) => row.COLUMN_NAME));
    const missing = ADDABLE.filter(([name]) => !present.has(name));

    if (missing.length === 0) return;

    for (const [name, definition] of missing) {
      await pool.query(`ALTER TABLE trips ADD COLUMN \`${name}\` ${definition}`);
      console.log(`[DB] Added trips.${name} to the trips table.`);
    }

    // Backfill so the NOT NULL tightening below cannot fail
    await pool.query(
      `UPDATE trips
       SET pickup_date   = DATE_ADD(CURDATE(), INTERVAL 2 DAY),
           pickup_time   = '09:00:00',
           delivery_date = DATE_ADD(CURDATE(), INTERVAL 4 DAY),
           payment_method = 'cash'
       WHERE pickup_date IS NULL`
    );
    await pool.query(
      `UPDATE trips SET cargo_type = 'General Goods' WHERE cargo_type IS NULL OR cargo_type = ''`
    );

    await pool.query(
      `ALTER TABLE trips
       MODIFY pickup_date    DATE NOT NULL,
       MODIFY pickup_time    TIME NOT NULL,
       MODIFY delivery_date  DATE NOT NULL,
       MODIFY payment_method ENUM('online', 'cash', 'net_banking', 'bank_transfer') NOT NULL,
       MODIFY cargo_type     VARCHAR(50) NOT NULL DEFAULT 'General Goods'`
    );
    await pool.query(
      `ALTER TABLE trips
       MODIFY load_reference VARCHAR(30) NOT NULL,
       MODIFY source        VARCHAR(100) NOT NULL,
       MODIFY destination   VARCHAR(100) NOT NULL,
       MODIFY vehicle_type  VARCHAR(50) NOT NULL`
    );

    // Guarded individually: a partial run can leave the columns present and the
    // indexes already in place, and a bare ADD INDEX would then abort the rest.
    for (const [name, column] of [
      ['idx_trips_pickup_date', 'pickup_date'],
      ['idx_trips_payment_method', 'payment_method']
    ]) {
      if (!(await indexExists('trips', name))) {
        await pool.query(`ALTER TABLE trips ADD INDEX \`${name}\` (\`${column}\`)`);
      }
    }

    console.log('[DB] Migrated the trips table for India localisation (schedule, payment method, notes).');
  } catch (error) {
    console.error(`[DB] Could not migrate the trips table: ${error.message}`);
  }
}

/**
 * Every column sql/02_trip_lifecycle.sql adds, in dependency order.
 *
 * The six privacy columns are added nullable, then backfilled, then tightened
 * to NOT NULL — MySQL cannot add a NOT NULL column to a table that already has
 * rows, so the order is the only way it works.
 *
 * delivery_address stays nullable on purpose: the driver is told to call the
 * receiver when there is no address to show.
 */
const LIFECYCLE_COLUMNS = [
  // STEP 1 — privacy
  ['pickup_address', 'TEXT NULL'],
  ['pickup_contact_name', 'VARCHAR(100) NULL'],
  ['pickup_contact_phone', 'VARCHAR(20) NULL'],
  ['delivery_address', 'TEXT NULL'],
  ['receiver_name', 'VARCHAR(100) NULL'],
  ['receiver_phone', 'VARCHAR(20) NULL'],

  // STEP 2 — assignment, OTP, delivery, payment
  ['assigned_driver_id', 'INT NULL'],
  ['pickup_otp', 'CHAR(4) NULL'],
  ['delivery_otp', 'CHAR(4) NULL'],
  ['otp_attempts', 'INT NOT NULL DEFAULT 0'],
  ['confirm_by', 'DATETIME NULL'],
  ['delivered_at', 'DATETIME NULL'],
  ['delivery_proof_url', 'VARCHAR(255) NULL'],
  ['payment_status', "ENUM('pending','paid') NOT NULL DEFAULT 'pending'"]
];

/** Placeholders for existing rows, so the NOT NULL tightening cannot fail. */
const LIFECYCLE_BACKFILL = {
  pickup_address: 'Address not provided',
  pickup_contact_name: 'Not provided',
  pickup_contact_phone: '0000000000',
  receiver_name: 'Not provided',
  receiver_phone: '0000000000'
};

const STATUS_ENUM =
  "enum('open','assigned','confirmed','in_transit','delivered','completed','cancelled')";

/**
 * Trip lifecycle & privacy schema — the automatic counterpart of
 * backend/sql/02_trip_lifecycle.sql.
 *
 * Without this, a database created before the lifecycle work has no
 * pickup_address column and every Post Trip save dies with
 * "Unknown column 'pickup_address' in 'field list'". Running it at startup
 * means the schema and the code cannot drift apart.
 *
 * Idempotent and safe to interrupt: each step checks information_schema first,
 * so a half-finished run converges on the next boot.
 */
async function ensureTripLifecycleSchema() {
  try {
    if (!(await tableExists('trips'))) return; // schema.sql will make it correctly

    // ── STEP 1/2 — add any missing columns ──────────────────────────────
    const present = await columnsOf('trips');
    const missing = LIFECYCLE_COLUMNS.filter(([name]) => !present.has(name));

    for (const [name, definition] of missing) {
      await pool.query(`ALTER TABLE trips ADD COLUMN \`${name}\` ${definition}`);
      console.log(`[DB] Added trips.${name}.`);
    }

    if (missing.length === 0) {
      // Nothing new to add, but the tables/index below may still be missing
      // from a partial run, so fall through rather than returning.
      console.log('[DB] trips table already has the lifecycle columns.');
    }

    // ── STEP 1 — backfill, then tighten to NOT NULL ──────────────────────
    for (const [name, placeholder] of Object.entries(LIFECYCLE_BACKFILL)) {
      await pool.query(
        `UPDATE trips SET \`${name}\` = ? WHERE \`${name}\` IS NULL`,
        [placeholder]
      );
    }

    // Only tighten the columns that are actually still nullable. Re-issuing
    // MODIFY on every boot would ask MySQL to rebuild the table for nothing.
    const { rows: nullableRows } = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trips'
          AND IS_NULLABLE = 'YES'
          AND COLUMN_NAME IN (?, ?, ?, ?, ?)`,
      Object.keys(LIFECYCLE_BACKFILL)
    );
    const stillNullable = new Set(nullableRows.map((row) => row.COLUMN_NAME));

    if (stillNullable.size > 0) {
      await pool.query(
        `ALTER TABLE trips
          MODIFY COLUMN pickup_address       TEXT         NOT NULL,
          MODIFY COLUMN pickup_contact_name  VARCHAR(100) NOT NULL,
          MODIFY COLUMN pickup_contact_phone VARCHAR(20)  NOT NULL,
          MODIFY COLUMN receiver_name        VARCHAR(100) NOT NULL,
          MODIFY COLUMN receiver_phone       VARCHAR(20)  NOT NULL`
      );
      console.log('[DB] Tightened the required pickup/receiver columns to NOT NULL.');
    }

    // ── STEP 2 — assigned driver FK (ON DELETE SET NULL) ─────────────────
    // Deleting a driver account must not delete live trips.
    if (!(await constraintExists('trips', 'fk_trips_assigned_driver'))) {
      await pool.query(
        `ALTER TABLE trips
          ADD CONSTRAINT fk_trips_assigned_driver
          FOREIGN KEY (assigned_driver_id) REFERENCES users(id)
          ON DELETE SET NULL ON UPDATE CASCADE`
      );
      console.log('[DB] Added fk_trips_assigned_driver on trips.assigned_driver_id.');
    }

    // ── STEP 3 — widen trips.status to the full lifecycle ────────────────
    // An ENUM cannot be re-pointed in place, and the legacy value must be
    // remapped while the column is still a VARCHAR, because 'in_transit' is
    // not in the old enum and MySQL would truncate it to ''.
    const [statusCol] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trips' AND COLUMN_NAME = 'status'`
    );
    const currentType = String(statusCol?.[0]?.COLUMN_TYPE || '').toLowerCase();

    if (currentType !== STATUS_ENUM) {
      if (currentType.startsWith('enum')) {
        await pool.query('ALTER TABLE trips MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT \'open\'');
        await pool.query("UPDATE trips SET status = 'in_transit' WHERE status = 'in_progress'");
      }
      await pool.query(
        `ALTER TABLE trips
          MODIFY COLUMN status ${STATUS_ENUM} NOT NULL DEFAULT 'open'`
      );
      console.log('[DB] Widened trips.status to the full lifecycle ENUM.');
    }

    // ── STEP 4 — index for the driver's Active Trip lookup ───────────────
    if (!(await indexExists('trips', 'idx_trips_assigned_driver'))) {
      await pool.query('ALTER TABLE trips ADD INDEX idx_trips_assigned_driver (assigned_driver_id)');
      console.log('[DB] Added idx_trips_assigned_driver on trips.');
    }

    // ── STEP 5/6/7 — the three new tables ────────────────────────────────
    // Mirrors schema.sql exactly, so a database migrated this way and a fresh
    // install end up with the same shape.
    if (!(await tableExists('trip_updates'))) {
      await pool.query(
        `CREATE TABLE trip_updates (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          trip_id    INT NOT NULL,
          driver_id  INT NOT NULL,
          type       ENUM('reached_pickup','loaded','checkpoint','delay','reached_destination','delivered')
                     NOT NULL,
          message    VARCHAR(255) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_trip_updates_trip
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_trip_updates_driver
            FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          INDEX idx_trip_updates_trip_created (trip_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
      console.log('[DB] Created table trip_updates.');
    }

    if (!(await tableExists('notifications'))) {
      // trip_id is ON DELETE SET NULL so a deleted trip leaves a readable
      // bell entry rather than cascading the notification away.
      await pool.query(
        `CREATE TABLE notifications (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          user_id    INT NOT NULL,
          trip_id    INT NULL,
          message    VARCHAR(255) NOT NULL,
          is_read    BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_notifications_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_notifications_trip
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL ON UPDATE CASCADE,
          INDEX idx_notifications_user_unread (user_id, is_read, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
      console.log('[DB] Created table notifications.');
    }

    if (!(await tableExists('ratings'))) {
      // UNIQUE(trip_id) makes "rate once" a database guarantee, so two
      // concurrent requests cannot both succeed.
      await pool.query(
        `CREATE TABLE ratings (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          trip_id     INT NOT NULL,
          operator_id INT NOT NULL,
          driver_id   INT NOT NULL,
          stars       TINYINT NOT NULL,
          comment     VARCHAR(500) NULL,
          created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_ratings_trip UNIQUE (trip_id),
          CONSTRAINT fk_ratings_trip
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_ratings_operator
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_ratings_driver
            FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT chk_ratings_stars CHECK (stars BETWEEN 1 AND 5)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
      console.log('[DB] Created table ratings.');
    }

    console.log('[DB] Trip lifecycle schema is up to date.');
  } catch (error) {
    console.error(`[DB] Could not apply the trip lifecycle schema: ${error.message}`);
    console.error('[DB] Run backend/sql/02_trip_lifecycle.sql in MySQL Workbench, then restart the server.');
  }
}

module.exports = {
  pool,
  testConnection
};
