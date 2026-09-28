const { pool } = require('../config/db');

/**
 * Operator → driver rating, one per trip.
 * The UNIQUE(trip_id) constraint is the real guard; the SELECT here only
 * exists to return a friendly 409 instead of a raw ER_DUP_ENTRY.
 */
class RatingModel {
  static async create({ trip_id, operator_id, driver_id, stars, comment = null }) {
    const [result] = await pool.execute(
      `INSERT INTO ratings (trip_id, operator_id, driver_id, stars, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [trip_id, operator_id, driver_id, stars, comment]
    );
    return this.findByTrip(trip_id);
  }

  static async findByTrip(trip_id) {
    const [rows] = await pool.execute(
      `SELECT
         r.id,
         r.trip_id,
         r.operator_id,
         r.driver_id,
         r.stars,
         r.comment,
         DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
         d.name AS driver_name
       FROM ratings r
       JOIN users d ON r.driver_id = d.id
       WHERE r.trip_id = ?`,
      [trip_id]
    );
    return rows[0] || null;
  }
}

module.exports = RatingModel;
