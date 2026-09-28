const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Every notification route is owner-scoped: the queries filter on
 * req.user.id, so one user can never read or clear another's bell.
 *
 * Available to any authenticated role — both drivers and operators are
 * notified during the lifecycle.
 */
router.get('/', authenticateToken, NotificationController.getNotifications);

// Static segment first, otherwise '/:id/read' would try to parse 'read-all'
// as an id.
router.put('/read-all', authenticateToken, NotificationController.markAllRead);

router.put('/:id/read', authenticateToken, NotificationController.markRead);

module.exports = router;
