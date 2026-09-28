const { pool } = require('../config/db');

/**
 * Trip columns joined into application queries.
 *
 * Two rules govern this list:
 *
 * 1. Schedule columns go through DATE_FORMAT so they arrive as plain strings
 *    rather than timezone-shifted JS Date objects — see the matching note in
 *    tripModel.js. pickup_time uses DATE_FORMAT rather than TIME_FORMAT
 *    because TIME_FORMAT returns NULL for 00:00.
 *
 * 2. No address, contact, receiver or OTP column appears here. These queries
 *    feed a driver's own application list, and pickup details must not reach
 *    a driver until they have confirmed the trip.
 */
const TRIP_JOIN_FIELDS = `
  t.load_reference,
  t.fleet_operator_id,
  t.source,
  t.destination,
  t.vehicle_type,
  t.cargo_type,
  t.weight_tonnes,
  t.price,
  DATE_FORMAT(t.pickup_date, '%Y-%m-%d')   AS pickup_date,
  DATE_FORMAT(t.pickup_time, '%H:%i')       AS pickup_time,
  DATE_FORMAT(t.delivery_date, '%Y-%m-%d')  AS delivery_date,
  t.payment_method,
  t.payment_status,
  t.notes,
  t.status AS trip_status,
  t.assigned_driver_id,
  t.confirm_by,
  t.delivered_at
`;

class ApplicationModel {
  /**
   * Create an application from an owner driver for a trip
   */
  static async createApplication({ trip_id, owner_driver_id }) {
    const [result] = await pool.execute(
      `INSERT INTO applications (trip_id, owner_driver_id, status)
       VALUES (?, ?, 'pending')`,
      [trip_id, owner_driver_id]
    );

    return this.findById(result.insertId);
  }

  /**
   * Find application by ID with trip and driver details
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT
        a.id,
        a.trip_id,
        a.owner_driver_id,
        a.status,
        a.rejection_reason,
        a.applied_at,
        ${TRIP_JOIN_FIELDS},
        d.name AS driver_name,
        d.email AS driver_email,
        d.phone_number AS driver_phone
      FROM applications a
      JOIN trips t ON a.trip_id = t.id
      JOIN users d ON a.owner_driver_id = d.id
      WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Check if driver already applied to this trip
   */
  static async findByTripAndDriver(trip_id, owner_driver_id) {
    const [rows] = await pool.execute(
      `SELECT id, trip_id, owner_driver_id, status, rejection_reason, applied_at
       FROM applications
       WHERE trip_id = ? AND owner_driver_id = ?`,
      [trip_id, owner_driver_id]
    );
    return rows[0] || null;
  }

  /**
   * Get all applications submitted by a specific Owner Driver,
   * including the trip's schedule, price and payment method
   */
  static async getApplicationsByDriver(owner_driver_id) {
    const query = `
      SELECT
        a.id AS application_id,
        a.trip_id,
        a.status AS application_status,
        a.rejection_reason,
        a.applied_at,
        ${TRIP_JOIN_FIELDS},
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone
      FROM applications a
      JOIN trips t ON a.trip_id = t.id
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE a.owner_driver_id = ?
      ORDER BY a.applied_at DESC
    `;

    const [rows] = await pool.execute(query, [owner_driver_id]);
    return rows;
  }

  /**
   * Get all applicants for a specific trip (for Fleet Operator),
   * with the trip's schedule and payment method attached
   */
  static async getApplicantsByTrip(trip_id) {
    const query = `
      SELECT
        a.id AS application_id,
        a.trip_id,
        a.status AS application_status,
        a.rejection_reason,
        a.applied_at,
        ${TRIP_JOIN_FIELDS},
        u.id AS driver_id,
        u.name AS driver_name,
        u.email AS driver_email,
        u.phone_number AS driver_phone,
        u.company_name AS driver_company
      FROM applications a
      JOIN trips t ON a.trip_id = t.id
      JOIN users u ON a.owner_driver_id = u.id
      WHERE a.trip_id = ?
      ORDER BY a.applied_at ASC
    `;

    const [rows] = await pool.execute(query, [trip_id]);
    return rows;
  }

  /**
   * Reject an application with optional rejection reason
   */
  static async rejectApplication(application_id, rejection_reason = null) {
    await pool.execute(
      `UPDATE applications 
       SET status = 'rejected', rejection_reason = ? 
       WHERE id = ?`,
      [rejection_reason, application_id]
    );

    return this.findById(application_id);
  }

  /**
   * Approve an applicant.
   *
   * The trip mutation itself lives in TripModel.assignTrip(), which needs a
   * dedicated connection for its FOR UPDATE lock. This method therefore does
   * not open a transaction of its own — it verifies the pending state and
   * returns the ids the caller needs, leaving the atomic work in one place.
   */
  static async getPendingContext(application_id) {
    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.trip_id,
         a.status,
         a.owner_driver_id,
         t.status AS trip_status,
         t.fleet_operator_id
       FROM applications a
       JOIN trips t ON a.trip_id = t.id
       WHERE a.id = ?`,
      [application_id]
    );
    return rows[0] || null;
  }

  /**
   * This driver's accepted application for a trip, used to decide whether the
   * "Confirm Trip" banner should show.
   */
  static async getAcceptedForDriver(application_id) {
    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.trip_id,
         a.status,
         DATE_FORMAT(t.confirm_by, '%Y-%m-%d %H:%i:%s') AS confirm_by,
         t.status AS trip_status,
         t.assigned_driver_id
       FROM applications a
       JOIN trips t ON a.trip_id = t.id
       WHERE a.id = ?`,
      [application_id]
    );
    return rows[0] || null;
  }
}

module.exports = ApplicationModel;
