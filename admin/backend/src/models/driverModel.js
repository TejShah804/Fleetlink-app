const { pool } = require('../config/db');

class DriverModel {
  /**
   * Every owner driver with how many transports they applied for, how many they
   * won, and how many distinct lanes they have travelled.
   */
  static async listDrivers({ search, sort } = {}) {
    let query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.company_name,
        u.created_at,
        COUNT(a.id)                                   AS application_count,
        COALESCE(SUM(a.status = 'pending'), 0)         AS pending_count,
        COALESCE(SUM(a.status = 'accepted'), 0)        AS accepted_count,
        COALESCE(SUM(a.status = 'rejected'), 0)        AS rejected_count,
        COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN t.id END) AS transports_taken,
        COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN CONCAT(t.source, ' -> ', t.destination) END) AS routes_travelled,
        COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN t.price ELSE 0 END), 0) AS earned_value
      FROM users u
      LEFT JOIN applications a ON a.owner_driver_id = u.id
      LEFT JOIN trips t ON t.id = a.trip_id
      WHERE u.role = 'owner_driver'
      GROUP BY u.id, u.name, u.email, u.phone_number, u.company_name, u.created_at
    `;

    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const sortColumns = {
      applications: 'application_count',
      accepted: 'accepted_count',
      routes: 'routes_travelled',
      earnings: 'earned_value',
      name: 'u.name',
      newest: 'u.created_at'
    };
    const direction = sort === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumns[sort] || 'application_count'} ${direction}, u.name ASC`;

    const [rows] = await pool.execute(query, params);

    return rows.map((row) => ({
      ...row,
      application_count: Number(row.application_count),
      pending_count: Number(row.pending_count),
      accepted_count: Number(row.accepted_count),
      rejected_count: Number(row.rejected_count),
      transports_taken: Number(row.transports_taken),
      routes_travelled: Number(row.routes_travelled),
      earned_value: Number(row.earned_value)
    }));
  }

  /**
   * Single owner driver profile: every application they made and the lane it was for
   */
  static async getDriverById(id) {
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone_number,
         u.company_name,
         u.message,
         u.created_at
       FROM users u
       WHERE u.id = ? AND u.role = 'owner_driver'`,
      [id]
    );

    const driver = rows[0] || null;
    if (!driver) return null;

    const [applications] = await pool.execute(
      `SELECT
         a.id AS application_id,
         a.status AS application_status,
         a.rejection_reason,
         a.applied_at,
         t.id AS trip_id,
         t.load_reference,
         t.source,
         t.destination,
         t.vehicle_type,
         t.cargo_type,
         t.weight_tonnes,
         t.price,
         t.status AS trip_status,
         o.name AS operator_name,
         o.company_name AS operator_company
       FROM applications a
       JOIN trips t ON t.id = a.trip_id
       JOIN users o ON o.id = t.fleet_operator_id
       WHERE a.owner_driver_id = ?
       ORDER BY a.applied_at DESC`,
      [id]
    );

    // Lanes this driver has actually travelled (accepted transports only)
    const [routes] = await pool.execute(
      `SELECT
         t.source,
         t.destination,
         COUNT(*)              AS times_travelled,
         COALESCE(SUM(t.price), 0) AS total_value
       FROM applications a
       JOIN trips t ON t.id = a.trip_id
       WHERE a.owner_driver_id = ? AND a.status = 'accepted'
       GROUP BY t.source, t.destination
       ORDER BY times_travelled DESC, total_value DESC`,
      [id]
    );

    return {
      driver,
      applications,
      routes: routes.map((r) => ({
        ...r,
        times_travelled: Number(r.times_travelled),
        total_value: Number(r.total_value)
      }))
    };
  }
}

module.exports = DriverModel;
