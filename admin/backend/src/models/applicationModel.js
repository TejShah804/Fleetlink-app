const { pool } = require('../config/db');

const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected'];

class ApplicationModel {
  /**
   * Every application on the platform, joined to its transport, its driver and the
   * transport owner, so one row answers "which driver applied to what, and where".
   */
  static async listApplications({ status, driver_id, operator_id, trip_id, search } = {}) {
    let query = `
      SELECT
        a.id AS application_id,
        a.status AS application_status,
        a.rejection_reason,
        a.applied_at,
        t.id AS trip_id,
        t.load_reference,
        t.source,
        t.destination,
        t.vehicle_type,
        t.price,
        t.status AS trip_status,
        d.id AS driver_id,
        d.name AS driver_name,
        d.email AS driver_email,
        d.phone_number AS driver_phone,
        o.id AS operator_id,
        o.name AS operator_name,
        o.company_name AS operator_company
      FROM applications a
      JOIN trips t ON t.id = a.trip_id
      JOIN users d ON d.id = a.owner_driver_id
      JOIN users o ON o.id = t.fleet_operator_id
      WHERE 1 = 1
    `;

    const params = [];

    if (status && APPLICATION_STATUSES.includes(status)) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (driver_id) {
      query += ` AND a.owner_driver_id = ?`;
      params.push(driver_id);
    }

    if (trip_id) {
      query += ` AND a.trip_id = ?`;
      params.push(trip_id);
    }

    if (operator_id) {
      query += ` AND t.fleet_operator_id = ?`;
      params.push(operator_id);
    }

    if (search) {
      query += ` AND (d.name LIKE ? OR t.load_reference LIKE ? OR t.source LIKE ? OR t.destination LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY a.applied_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Lane report per driver — where each owner driver has travelled
   */
  static async getDriverRouteReport() {
    const [rows] = await pool.execute(
      `SELECT
         d.id AS driver_id,
         d.name AS driver_name,
         t.source,
         t.destination,
         COUNT(*)              AS times_travelled,
         COALESCE(SUM(t.price), 0) AS total_value
       FROM applications a
       JOIN trips t ON t.id = a.trip_id
       JOIN users d ON d.id = a.owner_driver_id
       WHERE a.status = 'accepted'
       GROUP BY d.id, d.name, t.source, t.destination
       ORDER BY times_travelled DESC, total_value DESC`
    );

    return rows.map((row) => ({
      ...row,
      times_travelled: Number(row.times_travelled),
      total_value: Number(row.total_value)
    }));
  }
}

module.exports = ApplicationModel;
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
