const { pool } = require('../config/db');

/**
 * One bell entry per user. Written by tripController and
 * applicationController, read by the notification routes.
 */
class NotificationModel {
  /**
   * Insert a notification.
   * Errors are swallowed by the callers' try/catch rather than here, so a
   * failed bell write can never roll back the business transaction that
   * triggered it.
   */
  static async create({ user_id, trip_id = null, message }) {
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, trip_id, message)
       VALUES (?, ?, ?)`,
      [user_id, trip_id, message]
    );
    return result.insertId;
  }

  /**
   * The user's notifications, newest first, with an unread count.
   * The count is a window function over the same page so the bell badge and
   * the list can never disagree.
   */
  static async getForUser(user_id, limit = 50) {
    const [rows] = await pool.execute(
      `SELECT
         n.id,
         n.trip_id,
         n.message,
         n.is_read,
         DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
         t.load_reference,
         t.status AS trip_status
       FROM notifications n
       LEFT JOIN trips t ON n.trip_id = t.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ?`,
      [user_id, limit]
    );

    const [counts] = await pool.execute(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [user_id]
    );

    return {
      notifications: rows,
      unread_count: Number(counts[0].unread_count) || 0
    };
  }

  /**
   * Mark one notification read. Scoped to user_id so one user cannot clear
   * another's bell by guessing an id.
   */
  static async markRead(id, user_id) {
    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [id, user_id]
    );
    return result.affectedRows > 0;
  }

  static async markAllRead(user_id) {
    const [result] = await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
      [user_id]
    );
    return result.affectedRows;
  }
}

module.exports = NotificationModel;
