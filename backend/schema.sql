-- FleetLink Database Schema — complete current schema for a FRESH install
-- Run these commands in your MySQL client (e.g. MySQL CLI, phpMyAdmin, MySQL Workbench)
--
-- This file is the full target state. An EXISTING database should instead run
-- the two migrations, in this order:
--     1. migrate_india_trips.sql   (schedule + payment columns)
--     2. sql/02_trip_lifecycle.sql (privacy, OTP, timeline, notifications, ratings)
-- Do not run the migrations against a database created from this file — the
-- columns and tables are already here.

-- 1. Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS fleetlink_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fleetlink_db;

-- 2. Users Table
-- Supports 3 roles: 'owner_driver', 'fleet_operator', 'other' (lead capture only)
-- Note: password_hash is NULLable because role='other' does not have credentials
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  phone_number VARCHAR(50) NOT NULL,
  company_name VARCHAR(255) NULL,
  role ENUM('owner_driver', 'fleet_operator', 'other') NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Trips Table
-- Posted and managed by fleet operators. Price is in Indian Rupees (INR).
--
-- Lifecycle: open → assigned → confirmed → in_transit → delivered → completed
--            (cancelled from open/assigned/confirmed)
--
-- The pickup/receiver columns are NOT NULL: the Post Trip form requires
-- them. Existing rows were backfilled with neutral placeholders by
-- migrate_india_trips.sql's successor, sql/02_trip_lifecycle.sql.
-- delivery_address stays NULLable — the driver is told to call the receiver.
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_reference VARCHAR(30) UNIQUE NOT NULL,
  fleet_operator_id INT NOT NULL,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  cargo_type VARCHAR(50) NOT NULL DEFAULT 'General Goods',
  weight_tonnes DECIMAL(6, 2) NULL,
  price DECIMAL(10, 2) NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  delivery_date DATE NOT NULL,
  payment_method ENUM('online', 'cash', 'net_banking', 'bank_transfer') NOT NULL,
  notes TEXT NULL,

  -- Privacy: released to a driver only after they confirm the assignment
  pickup_address TEXT NOT NULL,
  pickup_contact_name VARCHAR(100) NOT NULL,
  pickup_contact_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NULL,
  receiver_name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,

  -- Assignment and lifecycle
  assigned_driver_id INT NULL,
  pickup_otp CHAR(4) NULL,
  delivery_otp CHAR(4) NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  confirm_by DATETIME NULL,
  delivered_at DATETIME NULL,
  delivery_proof_url VARCHAR(255) NULL,
  payment_status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',

  status ENUM('open', 'assigned', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled')
    NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_trips_status (status),
  INDEX idx_trips_fleet_operator (fleet_operator_id),
  INDEX idx_trips_pickup_date (pickup_date),
  INDEX idx_trips_payment_method (payment_method),
  INDEX idx_trips_assigned_driver (assigned_driver_id),

  CONSTRAINT fk_trips_fleet_operator
    FOREIGN KEY (fleet_operator_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- ON DELETE SET NULL: deleting a driver account must not delete live trips
  CONSTRAINT fk_trips_assigned_driver
    FOREIGN KEY (assigned_driver_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Applications Table
-- Submitted by owner drivers for open trips
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  owner_driver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_status (status),
  INDEX idx_app_trip (trip_id),
  INDEX idx_app_driver (owner_driver_id),
  UNIQUE KEY uq_trip_driver (trip_id, owner_driver_id), -- same trip can have many drivers; one apply per driver
  CONSTRAINT fk_applications_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_applications_owner_driver
    FOREIGN KEY (owner_driver_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Trip Updates Table
-- The milestone timeline. created_at has no ON UPDATE because these rows are
-- append-only — a later edit must never rewrite history.
CREATE TABLE IF NOT EXISTS trip_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  driver_id INT NOT NULL,
  type ENUM('reached_pickup', 'loaded', 'checkpoint', 'delay', 'reached_destination', 'delivered')
    NOT NULL,
  message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_trip_updates_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_trip_updates_driver
    FOREIGN KEY (driver_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- the timeline is read newest-first per trip
  INDEX idx_trip_updates_trip_created (trip_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Notifications Table
-- trip_id is ON DELETE SET NULL so deleting a trip leaves a readable bell
-- entry ("Trip #FL-TRP-1234 was cancelled") instead of cascading it away.
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  trip_id INT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  -- the bell only ever asks for one user's unread rows
  INDEX idx_notifications_user_unread (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Ratings Table
-- The operator rates the driver once per trip. UNIQUE(trip_id) is what makes
-- "rate once" a database guarantee rather than an application convention, so
-- two concurrent requests cannot both succeed.
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  operator_id INT NOT NULL,
  driver_id INT NOT NULL,
  stars TINYINT NOT NULL,
  comment VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_ratings_trip UNIQUE (trip_id),
  CONSTRAINT fk_ratings_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_operator
    FOREIGN KEY (operator_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_driver
    FOREIGN KEY (driver_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT chk_ratings_stars CHECK (stars BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
