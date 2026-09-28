const { pool } = require('../config/db');

/**
 * Clamp a caller-supplied LIMIT into a safe integer before it is inlined into SQL.
 * Limits are never taken from user input as raw strings.
 */
function safeLimit(value, fallback = 10, max = 100) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

class StatsModel {
  /**
   * Headline user counts per role
   */
  static async getUserCounts() {
    const [rows] = await pool.execute(
      `SELECT
         COALESCE(SUM(role = 'owner_driver'), 0)  AS owner_drivers,
         COALESCE(SUM(role = 'fleet_operator'), 0) AS operators,
         COALESCE(SUM(role = 'other'), 0)          AS leads,
         COALESCE(SUM(role = 'admin'), 0)          AS admins,
         COUNT(*)                                   AS total_users
       FROM users`
    );

    const row = rows[0];
    return {
      owner_drivers: Number(row.owner_drivers),
      operators: Number(row.operators),
      leads: Number(row.leads),
      admins: Number(row.admins),
      total_users: Number(row.total_users)
    };
  }

  /**
   * Transport counts + value, broken down by trip status
   */
  static async getTripCounts() {
    const [rows] = await pool.execute(
      `SELECT
         COUNT(*)                                        AS total_trips,
         COALESCE(SUM(status = 'open'), 0)                AS open_trips,
         COALESCE(SUM(status = 'assigned'), 0)            AS assigned_trips,
         COALESCE(SUM(status = 'in_progress'), 0)         AS in_progress_trips,
         COALESCE(SUM(status = 'completed'), 0)           AS completed_trips,
         COALESCE(SUM(status = 'cancelled'), 0)           AS cancelled_trips,
         COALESCE(SUM(price), 0)                          AS total_transport_value,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) AS completed_value
       FROM trips`
    );

    const row = rows[0];
    const totalTrips = Number(row.total_trips);
    return {
      total_trips: totalTrips,
      open_trips: Number(row.open_trips),
      assigned_trips: Number(row.assigned_trips),
      in_progress_trips: Number(row.in_progress_trips),
      completed_trips: Number(row.completed_trips),
      cancelled_trips: Number(row.cancelled_trips),
      total_transport_value: Number(row.total_transport_value),
      completed_value: Number(row.completed_value),
      avg_transport_value: totalTrips ? Number(row.total_transport_value) / totalTrips : 0
    };
  }

  /**
   * Application counts by status + how many transports actually got a driver
   */
  static async getApplicationCounts() {
    const [rows] = await pool.execute(
      `SELECT
         COUNT(*)                                AS total_applications,
         COALESCE(SUM(status = 'pending'), 0)    AS pending_applications,
         COALESCE(SUM(status = 'accepted'), 0)   AS accepted_applications,
         COALESCE(SUM(status = 'rejected'), 0)   AS rejected_applications
       FROM applications`
    );

    const row = rows[0];
    return {
      total_applications: Number(row.total_applications),
      pending_applications: Number(row.pending_applications),
      accepted_applications: Number(row.accepted_applications),
      rejected_applications: Number(row.rejected_applications)
    };
  }

  /**
   * Signup / transport / application velocity for the last 7 and 30 days
   */
  static async getRecentActivity() {
    const [rows] = await pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM users       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS new_users_7d,
         (SELECT COUNT(*) FROM users       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_users_30d,
         (SELECT COUNT(*) FROM trips       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS new_trips_7d,
         (SELECT COUNT(*) FROM trips       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_trips_30d,
         (SELECT COUNT(*) FROM applications WHERE applied_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS new_applications_7d,
         (SELECT COUNT(*) FROM applications WHERE applied_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_applications_30d
    `);

    const row = rows[0];
    return {
      new_users_7d: Number(row.new_users_7d),
      new_users_30d: Number(row.new_users_30d),
      new_trips_7d: Number(row.new_trips_7d),
      new_trips_30d: Number(row.new_trips_30d),
      new_applications_7d: Number(row.new_applications_7d),
      new_applications_30d: Number(row.new_applications_30d)
    };
  }

  /**
   * Busiest lanes (source → destination) across every transport
   */
  static async getTopRoutes(limit = 8) {
    const max = safeLimit(limit, 8, 50);
    const [rows] = await pool.execute(
      `SELECT
         t.source,
         t.destination,
         COUNT(*)                              AS trip_count,
         COALESCE(SUM(t.price), 0)             AS total_value,
         COALESCE(SUM(t.status = 'completed'), 0) AS completed_count
       FROM trips t
       GROUP BY t.source, t.destination
       ORDER BY trip_count DESC, total_value DESC
       LIMIT ${max}`
    );

    return rows.map((row) => ({
      ...row,
      trip_count: Number(row.trip_count),
      completed_count: Number(row.completed_count),
      total_value: Number(row.total_value)
    }));
  }

  /**
   * Transport owners ranked by how many transports they have given
   */
  static async getTopOperators(limit = 5) {
    const max = safeLimit(limit, 5, 50);
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         u.company_name,
         COUNT(t.id)                AS transport_count,
         COALESCE(SUM(t.price), 0)  AS total_value
       FROM users u
       LEFT JOIN trips t ON t.fleet_operator_id = u.id
       WHERE u.role = 'fleet_operator'
       GROUP BY u.id, u.name, u.company_name
       ORDER BY transport_count DESC, total_value DESC
       LIMIT ${max}`
    );

    return rows.map((row) => ({
      ...row,
      transport_count: Number(row.transport_count),
      total_value: Number(row.total_value)
    }));
  }

  /**
   * Owner drivers ranked by how many transports they actually got
   */
  static async getTopDrivers(limit = 5) {
    const max = safeLimit(limit, 5, 50);
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         COUNT(a.id)                              AS application_count,
         COALESCE(SUM(a.status = 'accepted'), 0)  AS accepted_count,
         COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN t.price ELSE 0 END), 0) AS earned_value
       FROM users u
       LEFT JOIN applications a ON a.owner_driver_id = u.id
       LEFT JOIN trips t ON t.id = a.trip_id
       WHERE u.role = 'owner_driver'
       GROUP BY u.id, u.name
       ORDER BY accepted_count DESC, application_count DESC
       LIMIT ${max}`
    );

    return rows.map((row) => ({
      ...row,
      application_count: Number(row.application_count),
      accepted_count: Number(row.accepted_count),
      earned_value: Number(row.earned_value)
    }));
  }

  /**
   * Transports vs applications per month for the last 6 months (dashboard chart)
   */
  static async getMonthlyTrend() {
    const [rows] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS month,
         COUNT(*)                        AS trips
       FROM trips
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY month`,
      []
    );

    const tripRows = rows;

    const [applicationRows] = await pool.execute(
      `SELECT
         DATE_FORMAT(applied_at, '%Y-%m') AS month,
         COUNT(*)                        AS applications
       FROM applications
       WHERE applied_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY month`
    );

    const byMonth = new Map();
    for (const row of tripRows) {
      byMonth.set(row.month, { month: row.month, trips: Number(row.trips), applications: 0 });
    }
    for (const row of applicationRows) {
      const entry = byMonth.get(row.month) || { month: row.month, trips: 0, applications: 0 };
      entry.applications = Number(row.applications);
      byMonth.set(row.month, entry);
    }

    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Everything the overview screen needs, in one call
   */
  static async getOverview() {
    const [users, trips, applications, activity, topRoutes, topOperators, topDrivers, trend] =
      await Promise.all([
        this.getUserCounts(),
        this.getTripCounts(),
        this.getApplicationCounts(),
        this.getRecentActivity(),
        this.getTopRoutes(8),
        this.getTopOperators(5),
        this.getTopDrivers(5),
        this.getMonthlyTrend()
      ]);

    return {
      users,
      trips,
      applications: {
        ...applications,
        // Applications per transport — needs the transport total, so it is derived here
        avg_applications_per_trip: trips.total_trips
          ? applications.total_applications / trips.total_trips
          : 0
      },
      activity,
      top_routes: topRoutes,
      top_operators: topOperators,
      top_drivers: topDrivers,
      monthly_trend: trend,
      generated_at: new Date().toISOString()
    };
  }
}

module.exports = StatsModel;
