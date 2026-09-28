-- FleetLink Admin — schema changes
-- The admin panel reuses the main database. Only one change is required:
-- the `users.role` ENUM has to accept 'admin'.
--
-- NOTE: the admin API applies this automatically on boot (see src/config/db.js →
-- ensureAdminRoleEnum), so running this file manually is optional.

USE fleetlink_db;

-- 1. Widen the role ENUM to include 'admin'.
-- 'admin' is appended last so every existing row keeps its current value.
-- If the ENUM already contains 'admin' this statement is a no-op.
ALTER TABLE users
  MODIFY role ENUM('owner_driver', 'fleet_operator', 'other', 'admin') NOT NULL;

-- 2. Create the first administrator.
-- The password below is a bcrypt hash of 'Admin@123'.
-- Prefer `npm run seed:admin` instead of pasting a hash, so the password
-- stays in .env instead of in version control.
--
-- INSERT INTO users (name, email, password_hash, phone_number, role)
-- VALUES (
--   'FleetLink Admin',
--   'admin@fleetlink.com',
--   '$2a$10$REPLACE_WITH_A_BCRYPT_HASH_OF_YOUR_PASSWORD',
--   '+91 90000 00000',
--   'admin'
-- );
