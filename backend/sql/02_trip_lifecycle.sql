-- =====================================================================
-- FleetLink — Trip Lifecycle & Privacy
-- File:    backend/sql/02_trip_lifecycle.sql
-- Target:  MySQL 8.0.16+ (run in MySQL Workbench)
-- Run:     AFTER migrate_india_trips.sql, ONCE.
--
--   Run order for an existing database:
--     1. migrate_india_trips.sql   (schedule + payment columns)
--     2. sql/02_trip_lifecycle.sql (this file)
--
--   A fresh install does not need either: schema.sql already contains every
--   column, table, CHECK and index both migrations add.
--
--   The server also applies this automatically at startup
--   (ensureTripLifecycleSchema in src/config/db.js), so you only need to run
--   this by hand if you would rather not restart the backend.
--
-- Why this is a run-once script:
--   MySQL 8.0 does NOT support "ADD COLUMN IF NOT EXISTS" or
--   "CREATE INDEX IF NOT EXISTS" — that is MariaDB syntax and it fails
--   with ER_PARSE_ERROR (1064) on MySQL. So every DDL statement below
--   is plain. Re-running raises ER_DUP_FIELDNAME, which is the signal
--   that the migration already ran.
--
-- Before running, confirm:
--   SELECT VERSION();          -- 8.0.16+ (CHECK constraints)
--   USE fleetlink_db;
--   SELECT status, COUNT(*) FROM trips GROUP BY status;
--     -- 'in_progress' rows are remapped to 'in_transit' in STEP 3
-- =====================================================================


-- ---------------------------------------------------------------------
-- STEP 1 — Privacy columns on `trips`
--
-- pickup_address / pickup_contact_name / pickup_contact_phone /
-- receiver_name / receiver_phone are REQUIRED by the new Post Trip
-- form, so existing rows get a neutral placeholder first and the
-- columns are tightened to NOT NULL afterwards. delivery_address stays
-- NULLable — the driver is told to call the receiver instead.
-- ---------------------------------------------------------------------
ALTER TABLE `trips`
  ADD COLUMN `pickup_address`       TEXT         NULL AFTER `notes`,
  ADD COLUMN `pickup_contact_name`  VARCHAR(100) NULL AFTER `pickup_address`,
  ADD COLUMN `pickup_contact_phone` VARCHAR(20)  NULL AFTER `pickup_contact_name`,
  ADD COLUMN `delivery_address`     TEXT         NULL AFTER `pickup_contact_phone`,
  ADD COLUMN `receiver_name`        VARCHAR(100) NULL AFTER `delivery_address`,
  ADD COLUMN `receiver_phone`       VARCHAR(20)  NULL AFTER `receiver_name`;

UPDATE `trips` SET `pickup_address`       = 'Address not provided' WHERE `pickup_address`       IS NULL;
UPDATE `trips` SET `pickup_contact_name`  = 'Not provided'        WHERE `pickup_contact_name`  IS NULL;
UPDATE `trips` SET `pickup_contact_phone` = '0000000000'          WHERE `pickup_contact_phone` IS NULL;
UPDATE `trips` SET `receiver_name`        = 'Not provided'        WHERE `receiver_name`        IS NULL;
UPDATE `trips` SET `receiver_phone`       = '0000000000'          WHERE `receiver_phone`       IS NULL;

ALTER TABLE `trips`
  MODIFY COLUMN `pickup_address`       TEXT         NOT NULL,
  MODIFY COLUMN `pickup_contact_name`  VARCHAR(100) NOT NULL,
  MODIFY COLUMN `pickup_contact_phone` VARCHAR(20)  NOT NULL,
  MODIFY COLUMN `receiver_name`        VARCHAR(100) NOT NULL,
  MODIFY COLUMN `receiver_phone`       VARCHAR(20)  NOT NULL;


-- ---------------------------------------------------------------------
-- STEP 2 — Assignment, OTP, delivery, and payment columns
-- ---------------------------------------------------------------------
ALTER TABLE `trips`
  ADD COLUMN `assigned_driver_id` INT      NULL AFTER `receiver_phone`,
  ADD COLUMN `pickup_otp`         CHAR(4)  NULL AFTER `assigned_driver_id`,
  ADD COLUMN `delivery_otp`       CHAR(4)  NULL AFTER `pickup_otp`,
  ADD COLUMN `otp_attempts`       INT      NOT NULL DEFAULT 0 AFTER `delivery_otp`,
  ADD COLUMN `confirm_by`         DATETIME NULL AFTER `otp_attempts`,
  ADD COLUMN `delivered_at`       DATETIME NULL AFTER `confirm_by`,
  ADD COLUMN `delivery_proof_url` VARCHAR(255) NULL AFTER `delivered_at`,
  ADD COLUMN `payment_status`     ENUM('pending','paid') NOT NULL DEFAULT 'pending' AFTER `delivery_proof_url`;

-- ON DELETE SET NULL: deleting a driver account must not delete live trips
ALTER TABLE `trips`
  ADD CONSTRAINT `fk_trips_assigned_driver`
    FOREIGN KEY (`assigned_driver_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
-- STEP 3 — Widen trips.status to the full lifecycle
--
-- An ENUM cannot be re-pointed in place, so the column is widened to
-- VARCHAR, the legacy value is remapped, then it is converted back.
-- ---------------------------------------------------------------------
UPDATE `trips` SET `status` = 'in_transit' WHERE `status` = 'in_progress';

ALTER TABLE `trips` MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'open';

ALTER TABLE `trips`
  MODIFY COLUMN `status`
    ENUM('open','assigned','confirmed','in_transit','delivered','completed','cancelled')
    NOT NULL DEFAULT 'open';


-- ---------------------------------------------------------------------
-- STEP 4 — Index for the driver's Active Trip lookup
--
-- Only ONE index is added here, on purpose:
--   • idx_trips_fleet_operator (fleet_operator_id) already exists in
--     schema.sql, so the operator list needs no new index.
--   • idx_trips_status already exists in schema.sql too. Re-adding it
--     would abort the script with ER_DUP_KEYNAME (1061).
--   • idx_trips_driver is genuinely new: every Active Trip read filters
--     on assigned_driver_id.
-- ---------------------------------------------------------------------
ALTER TABLE `trips` ADD INDEX `idx_trips_assigned_driver` (`assigned_driver_id`);


-- ---------------------------------------------------------------------
-- STEP 5 — trip_updates (the milestone timeline)
--
-- created_at is a plain TIMESTAMP (no ON UPDATE) because these rows are
-- append-only — a later edit must never rewrite history.
-- ---------------------------------------------------------------------
CREATE TABLE `trip_updates` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id`    INT NOT NULL,
  `driver_id`  INT NOT NULL,
  `type`       ENUM('reached_pickup','loaded','checkpoint','delay','reached_destination','delivered')
               NOT NULL,
  `message`    VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_trip_updates_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_trip_updates_driver`
    FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- the timeline is read newest-first per trip
  INDEX `idx_trip_updates_trip_created` (`trip_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- STEP 6 — notifications
--
-- trip_id is ON DELETE SET NULL so deleting a trip leaves a readable
-- bell entry ("Trip #FL-TRP-1234 was cancelled") instead of cascading
-- the notification away.
-- ---------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT NOT NULL,
  `trip_id`    INT NULL,
  `message`    VARCHAR(255) NOT NULL,
  `is_read`    BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_notifications_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  -- the bell only ever asks for one user's unread rows
  INDEX `idx_notifications_user_unread` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- STEP 7 — ratings (operator rates the driver, once per trip)
--
-- UNIQUE(trip_id) is what makes "rate once" a database guarantee
-- rather than an application convention, so two concurrent requests
-- cannot both succeed.
-- ---------------------------------------------------------------------
CREATE TABLE `ratings` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id`     INT NOT NULL,
  `operator_id` INT NOT NULL,
  `driver_id`   INT NOT NULL,
  `stars`       TINYINT NOT NULL,
  `comment`     VARCHAR(500) NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uq_ratings_trip` UNIQUE (`trip_id`),

  CONSTRAINT `fk_ratings_trip`
    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_operator`
    FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_driver`
    FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `chk_ratings_stars` CHECK (`stars` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- Verify — run after executing the script above
-- =====================================================================
DESCRIBE `trips`;

SELECT `status`, COUNT(*) AS total FROM `trips` GROUP BY `status`;

SHOW CREATE TABLE `trip_updates`;
SHOW CREATE TABLE `notifications`;
SHOW CREATE TABLE `ratings`;

-- Expected: 0
SELECT COUNT(*) AS orphan_driver_refs
  FROM `trips` t
  LEFT JOIN `users` u ON t.assigned_driver_id = u.id
 WHERE t.assigned_driver_id IS NOT NULL AND u.id IS NULL;
