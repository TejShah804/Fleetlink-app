const express = require('express');
const TripController = require('../controllers/tripController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, requireAdmin);

// Literal paths first so they are not swallowed by '/:id'
router.get('/', TripController.listTrips);
router.get('/routes', TripController.getRouteReport);
router.get('/:id', TripController.getTrip);
router.put('/:id/status', TripController.updateStatus);

module.exports = router;
