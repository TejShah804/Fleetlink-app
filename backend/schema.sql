-- FleetLink Database Schema
-- Run these commands in your MySQL client (e.g. MySQL CLI, phpMyAdmin, MySQL Workbench)

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
-- Posted and managed by fleet operators
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_reference VARCHAR(50) UNIQUE NOT NULL,
  fleet_operator_id INT NOT NULL,
  source VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  cargo_type VARCHAR(100) NULL,
  weight_tonnes DECIMAL(6, 2) NULL,
  price DECIMAL(10, 2) NOT NULL,
  status ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trips_status (status),
  INDEX idx_trips_fleet_operator (fleet_operator_id),
  INDEX idx_trips_load_ref (load_reference),
  CONSTRAINT fk_trips_fleet_operator
    FOREIGN KEY (fleet_operator_id)
    REFERENCES users(id)
    ON DELETE CASCADE
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
  UNIQUE KEY uq_trip_driver (trip_id, owner_driver_id),
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
