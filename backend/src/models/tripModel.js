const { pool } = require('../config/db');

class TripModel {
  /**
   * Helper to generate a unique trip reference code if not provided
   * e.g. FL-8492
   */
  static generateReference() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `FL-TRP-${num}`;
  }

  /**
   * Create a new trip (by Fleet Operator)
   */
  static async createTrip({ fleet_operator_id, load_reference, source, destination, vehicle_type, cargo_type = null, weight_tonnes = null, price }) {
    let finalRef = load_reference ? load_reference.trim() : this.generateReference();

    // Check if reference already exists, if so generate a new one if it was auto-generated
    if (!load_reference) {
      let isUnique = false;
      while (!isUnique) {
        const [existing] = await pool.execute('SELECT id FROM trips WHERE load_reference = ?', [finalRef]);
        if (existing.length === 0) {
          isUnique = true;
        } else {
          finalRef = this.generateReference();
        }
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO trips (fleet_operator_id, load_reference, source, destination, vehicle_type, cargo_type, weight_tonnes, price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [fleet_operator_id, finalRef, source, destination, vehicle_type, cargo_type, weight_tonnes, price]
    );

    return this.findById(result.insertId);
  }

  /**
   * Find trip by ID with fleet operator info
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        t.id,
        t.load_reference,
        t.fleet_operator_id,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.status,
        t.created_at,
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone,
        u.email AS operator_email
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find trip by load_reference
   */
  static async findByReference(load_reference) {
    const [rows] = await pool.execute(
      `SELECT id, load_reference FROM trips WHERE load_reference = ?`,
      [load_reference]
    );
    return rows[0] || null;
  }

  /**
   * Get all open trips with optional filters (source, destination, vehicle_type)
   * Open to owner drivers to browse and apply
   */
  static async getOpenTrips({ source, destination, vehicle_type } = {}) {
    let query = `
      SELECT 
        t.id,
        t.load_reference,
        t.fleet_operator_id,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.status,
        t.created_at,
        u.name AS operator_name,
        u.company_name AS operator_company,
        u.phone_number AS operator_phone
      FROM trips t
      JOIN users u ON t.fleet_operator_id = u.id
      WHERE t.status = 'open'
    `;

    const params = [];

    if (source) {
      query += ` AND t.source LIKE ?`;
      params.push(`%${source}%`);
    }

    if (destination) {
      query += ` AND t.destination LIKE ?`;
      params.push(`%${destination}%`);
    }

    if (vehicle_type) {
      query += ` AND LOWER(t.vehicle_type) = LOWER(?)`;
      params.push(vehicle_type);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Get all trips posted by a specific Fleet Operator, with applicant count
   */
  static async getTripsByOperator(fleet_operator_id) {
    const query = `
      SELECT 
        t.id,
        t.load_reference,
        t.fleet_operator_id,
        t.source,
        t.destination,
        t.vehicle_type,
        t.cargo_type,
        t.weight_tonnes,
        t.price,
        t.status,
        t.created_at,
        COUNT(a.id) AS applicant_count
      FROM trips t
      LEFT JOIN applications a ON t.id = a.trip_id
      WHERE t.fleet_operator_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    const [rows] = await pool.execute(query, [fleet_operator_id]);
    return rows;
  }

  /**
   * Update trip details
   */
  static async updateTrip(id, { load_reference, source, destination, vehicle_type, cargo_type = null, weight_tonnes = null, price }) {
    await pool.execute(
      `UPDATE trips 
       SET load_reference = COALESCE(?, load_reference),
           source = ?, 
           destination = ?, 
           vehicle_type = ?, 
           cargo_type = ?,
           weight_tonnes = ?,
           price = ?
       WHERE id = ?`,
      [load_reference || null, source, destination, vehicle_type, cargo_type, weight_tonnes, price, id]
    );

    return this.findById(id);
  }

  /**
   * Update trip status ('open', 'assigned', 'in_progress', 'completed', 'cancelled')
   */
  static async updateStatus(id, status) {
    await pool.execute(
      `UPDATE trips 
       SET status = ?
       WHERE id = ?`,
      [status, id]
    );

    return this.findById(id);
  }

  /**
   * Delete trip by ID
   */
  static async deleteTrip(id) {
    const [result] = await pool.execute(
      `DELETE FROM trips WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = TripModel;
