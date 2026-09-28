const { pool } = require('../config/db');

const TRIP_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

class TripModel {
  /**
   * Every transport on the platform, with its transport owner and applicant counts
   */
  static async listTrips({ status, operator_id, vehicle_type, search } = {}) {
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
        o.name AS operator_name,
        o.company_name AS operator_company,
        (
          SELECT COUNT(*) FROM applications a WHERE a.trip_id = t.id
        ) AS applicant_count,
        (
          SELECT COUNT(*) FROM applications a WHERE a.trip_id = t.id AND a.status = 'accepted'
        ) AS accepted_count
      FROM trips t
      JOIN users o ON o.id = t.fleet_operator_id
      WHERE 1 = 1
    `;

    const params = [];

    if (status && TRIP_STATUSES.includes(status)) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (operator_id) {
      query += ` AND t.fleet_operator_id = ?`;
      params.push(operator_id);
    }

    if (vehicle_type) {
      query += ` AND LOWER(t.vehicle_type) = LOWER(?)`;
      params.push(vehicle_type);
    }

    if (search) {
      query += ` AND (t.load_reference LIKE ? OR t.source LIKE ? OR t.destination LIKE ? OR o.name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [rows] = await pool.execute(query, params);

    return rows.map((row) => ({
      ...row,
      applicant_count: Number(row.applicant_count),
      accepted_count: Number(row.accepted_count)
    }));
  }

  /**
   * One transport plus everyone who applied to it
   */
  static async getTripById(id) {
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
         o.name AS operator_name,
         o.company_name AS operator_company,
         o.email AS operator_email,
         o.phone_number AS operator_phone
       FROM trips t
       JOIN users o ON o.id = t.fleet_operator_id
       WHERE t.id = ?`,
      [id]
    );

    const trip = rows[0] || null;
    if (!trip) return null;

    const [applicants] = await pool.execute(
      `SELECT
         a.id AS application_id,
         a.status AS application_status,
         a.rejection_reason,
         a.applied_at,
         d.id AS driver_id,
         d.name AS driver_name,
         d.email AS driver_email,
         d.phone_number AS driver_phone
       FROM applications a
       JOIN users d ON d.id = a.owner_driver_id
       WHERE a.trip_id = ?
       ORDER BY FIELD(a.status, 'accepted', 'pending', 'rejected'), a.applied_at ASC`,
      [id]
    );

    return { trip, applicants };
  }

  /**
   * Distinct lane report: which source → destination pairs are active, and how much
   * value plus how many completed transports each lane represents.
   */
  static async getRouteReport({ limit = 50 } = {}) {
    const parsed = parseInt(limit, 10);
    const max = Number.isNaN(parsed) ? 50 : Math.min(Math.max(parsed, 1), 200);

    const [rows] = await pool.execute(
      `SELECT
         t.source,
         t.destination,
         COUNT(*)                                  AS trip_count,
         COALESCE(SUM(t.price), 0)                 AS total_value,
         COALESCE(SUM(t.status = 'completed'), 0)  AS completed_count,
         COALESCE(SUM(t.status = 'cancelled'), 0)  AS cancelled_count,
         COUNT(DISTINCT t.fleet_operator_id)       AS operator_count,
         (
           SELECT COUNT(DISTINCT a.owner_driver_id)
           FROM applications a
           JOIN trips t3 ON t3.id = a.trip_id
           WHERE t3.source = t.source AND t3.destination = t.destination
         )                                        AS driver_count
       FROM trips t
       GROUP BY t.source, t.destination
       ORDER BY trip_count DESC, total_value DESC
       LIMIT ${max}`
    );

    return rows.map((row) => ({
      ...row,
      trip_count: Number(row.trip_count),
      total_value: Number(row.total_value),
      completed_count: Number(row.completed_count),
      cancelled_count: Number(row.cancelled_count),
      operator_count: Number(row.operator_count),
      driver_count: Number(row.driver_count)
    }));
  }

  /**
   * Admin moderation: move a transport to a different status
   */
  static async updateStatus(id, status) {
    const [result] = await pool.execute(
      'UPDATE trips SET status = ? WHERE id = ?',
      [status, id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = TripModel;
module.exports.TRIP_STATUSES = TRIP_STATUSES;
