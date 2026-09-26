const { pool } = require('../config/db');

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
        t.load_reference,
        t.fleet_operator_id,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.status AS trip_status,
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
   * Get all applications submitted by a specific Owner Driver
   */
  static async getApplicationsByDriver(owner_driver_id) {
    const query = `
      SELECT 
        a.id AS application_id,
        a.trip_id,
        a.status AS application_status,
        a.rejection_reason,
        a.applied_at,
        t.load_reference,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.status AS trip_status,
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
   * Get all applicants for a specific trip (for Fleet Operator)
   */
  static async getApplicantsByTrip(trip_id) {
    const query = `
      SELECT 
        a.id AS application_id,
        a.trip_id,
        a.status AS application_status,
        a.rejection_reason,
        a.applied_at,
        u.id AS driver_id,
        u.name AS driver_name,
        u.email AS driver_email,
        u.phone_number AS driver_phone,
        u.company_name AS driver_company
      FROM applications a
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
   * Accept an applicant with MySQL TRANSACTION:
   * 1. Set selected application to 'accepted'
   * 2. Set trip status to 'assigned'
   * 3. Set all other pending applications for that trip to 'rejected' with reason
   */
  static async acceptApplicationTransaction(application_id, trip_id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Accept this specific application
      await connection.execute(
        `UPDATE applications 
         SET status = 'accepted' 
         WHERE id = ?`,
        [application_id]
      );

      // 2. Update trip status to 'assigned'
      await connection.execute(
        `UPDATE trips 
         SET status = 'assigned' 
         WHERE id = ?`,
        [trip_id]
      );

      // 3. Reject other applications for this trip with clear explanation
      await connection.execute(
        `UPDATE applications 
         SET status = 'rejected', rejection_reason = 'Trip was assigned to another driver' 
         WHERE trip_id = ? AND id != ?`,
        [trip_id, application_id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ApplicationModel;
