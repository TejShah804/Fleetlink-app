-- FleetLink — India localisation migration for the `trips` table
--
-- Run this ONCE against an existing fleetlink_db that already has a `trips`
-- table. It narrows the string columns to Indian lengths, adds the schedule
-- (pickup / delivery dates + time) and payment method, and backfills existing
-- rows so the new NOT NULL columns can then be enforced.
--
-- New installs should just run schema.sql — this file is for existing data.
--
--   mysql -u root -p fleetlink_db < migrate_india_trips.sql

USE fleetlink_db;

-- ── 1. Add the new columns, nullable, and narrow the existing ones ───────────
-- The new columns start nullable because existing rows have no values yet.
-- MySQL drops the redundant index: load_reference is already UNIQUE.
ALTER TABLE trips
  MODIFY load_reference VARCHAR(30) NOT NULL,
  MODIFY source          VARCHAR(100) NOT NULL,
  MODIFY destination     VARCHAR(100) NOT NULL,
  MODIFY vehicle_type    VARCHAR(50) NOT NULL,
  MODIFY cargo_type      VARCHAR(50) NOT NULL DEFAULT 'General Goods',
  ADD COLUMN pickup_date    DATE NULL AFTER price,
  ADD COLUMN pickup_time    TIME NULL AFTER pickup_date,
  ADD COLUMN delivery_date  DATE NULL AFTER pickup_time,
  ADD COLUMN payment_method ENUM('online', 'cash', 'net_banking', 'bank_transfer') NULL AFTER delivery_date,
  ADD COLUMN notes          TEXT NULL AFTER payment_method,
  DROP INDEX idx_trips_load_ref,
  ADD INDEX idx_trips_pickup_date (pickup_date),
  ADD INDEX idx_trips_payment_method (payment_method);

-- ── 2. Backfill existing rows ────────────────────────────────────────────────
-- Historical loads get a forward-looking schedule and a default payment method
-- so the columns can be made NOT NULL. Adjust these per row if you care about
-- the real values for already-posted loads.
UPDATE trips
SET
  pickup_date    = DATE_ADD(CURDATE(), INTERVAL 2 DAY),
  pickup_time    = '09:00:00',
  delivery_date  = DATE_ADD(CURDATE(), INTERVAL 4 DAY),
  payment_method = 'cash'
WHERE pickup_date IS NULL;

UPDATE trips
SET cargo_type = 'General Goods'
WHERE cargo_type IS NULL OR cargo_type = '';

-- ── 3. Enforce NOT NULL now that every row is populated ──────────────────────
ALTER TABLE trips
  MODIFY pickup_date    DATE NOT NULL,
  MODIFY pickup_time    TIME NOT NULL,
  MODIFY delivery_date  DATE NOT NULL,
  MODIFY payment_method ENUM('online', 'cash', 'net_banking', 'bank_transfer') NOT NULL;
