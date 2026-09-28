const { pool } = require('../config/db');

class OperatorModel {
  /**
   * Every fleet operator (the "transport owners") with how many transports they
   * have given, the value of those transports, and how many drivers applied to them.
   */
  static async listOperators({ search, sort } = {}) {
    let query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.company_name,
        u.created_at,
        COUNT(t.id)                                       AS transport_count,
        COALESCE(SUM(t.price), 0)                         AS total_value,
        COALESCE(SUM(t.status = 'open'), 0)               AS open_count,
        COALESCE(SUM(t.status = 'assigned'), 0)           AS assigned_count,
        COALESCE(SUM(t.status = 'in_progress'), 0)        AS in_progress_count,
        COALESCE(SUM(t.status = 'completed'), 0)          AS completed_count,
        COALESCE(SUM(t.status = 'cancelled'), 0)          AS cancelled_count,
        (
          SELECT COUNT(*)
          FROM applications a
          JOIN trips t2 ON t2.id = a.trip_id
          WHERE t2.fleet_operator_id = u.id
        )                                                AS total_applications
      FROM users u
      LEFT JOIN trips t ON t.fleet_operator_id = u.id
      WHERE u.role = 'fleet_operator'
      GROUP BY u.id, u.name, u.email, u.phone_number, u.company_name, u.created_at
    `;

    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.company_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Only allow whitelisted sort keys; the value is never taken from input directly
    const sortColumns = {
      transports: 'transport_count',
      value: 'total_value',
      applications: 'total_applications',
      name: 'u.name',
      newest: 'u.created_at'
    };
    const direction = sort === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumns[sort] || 'transport_count'} ${direction}, u.name ASC`;

    const [rows] = await pool.execute(query, params);

    return rows.map((row) => ({
      ...row,
      transport_count: Number(row.transport_count),
      total_value: Number(row.total_value),
      open_count: Number(row.open_count),
      assigned_count: Number(row.assigned_count),
      in_progress_count: Number(row.in_progress_count),
      completed_count: Number(row.completed_count),
      cancelled_count: Number(row.cancelled_count),
      total_applications: Number(row.total_applications)
    }));
  }

  /**
   * Single transport owner profile + their transports
   */
  static async getOperatorById(id) {
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
       WHERE u.id = ? AND u.role = 'fleet_operator'`,
      [id]
    );

    const operator = rows[0] || null;
    if (!operator) return null;

    const [transports] = await pool.execute(
      `SELECT
         t.id,
         t.load_reference,
         t.source,
         t.destination,
         t.vehicle_type,
         t.cargo_type,
         t.weight_tonnes,
         t.price,
         t.status,
         t.created_at,
         (
           SELECT COUNT(*) FROM applications a WHERE a.trip_id = t.id
         ) AS applicant_count
       FROM trips t
       WHERE t.fleet_operator_id = ?
       ORDER BY t.created_at DESC`,
      [id]
    );

    // Lanes this operator most frequently offers
    const [routes] = await pool.execute(
      `SELECT
         t.source,
         t.destination,
         COUNT(*) AS trip_count
       FROM trips t
       WHERE t.fleet_operator_id = ?
       GROUP BY t.source, t.destination
       ORDER BY trip_count DESC
       LIMIT 10`,
      [id]
    );

    return {
      operator,
      transports: transports.map((t) => ({ ...t, applicant_count: Number(t.applicant_count) })),
      top_routes: routes.map((r) => ({ ...r, trip_count: Number(r.trip_count) }))
    };
  }
}

module.exports = OperatorModel;
