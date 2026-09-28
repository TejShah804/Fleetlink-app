const NotificationModel = require('../models/notificationModel');

class NotificationController {
  /**
   * GET /api/notifications
   * The caller's bell: newest notifications plus an unread count.
   * Polled by the driver navbar every 30 seconds.
   */
  static async getNotifications(req, res, next) {
    try {
      const { notifications, unread_count: unreadCount } =
        await NotificationModel.getForUser(req.user.id);

      return res.status(200).json({
        success: true,
        count: notifications.length,
        unread_count: unreadCount,
        notifications
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark one as read. Scoped to the caller, so another user's id is a 404
   * rather than a silent success.
   */
  static async markRead(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID parameter.'
        });
      }

      const updated = await NotificationModel.markRead(id, req.user.id);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Clears the whole badge in one call, which is what the dropdown's
   * "Mark all as read" action uses.
   */
  static async markAllRead(req, res, next) {
    try {
      const updated = await NotificationModel.markAllRead(req.user.id);

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
        updated
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
