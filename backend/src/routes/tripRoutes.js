const express = require('express');
const TripController = require('../controllers/tripController');
const ApplicationController = require('../controllers/applicationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Public or Driver-accessible routes:
 * GET /api/trips - browse all open trips with optional query filters (source, destination, vehicle_type)
 */
router.get('/', TripController.getOpenTrips);

/**
 * Fleet Operator protected routes:
 * Specific sub-routes must be placed before param route /:id
 */
router.get('/my', authenticateToken, requireRole('fleet_operator'), TripController.getMyTrips);

router.post('/', authenticateToken, requireRole('fleet_operator'), TripController.createTrip);

router.get('/:id/applicants', authenticateToken, requireRole('fleet_operator'), ApplicationController.getTripApplicants);

router.put('/:id/status', authenticateToken, requireRole('fleet_operator'), TripController.updateTripStatus);

router.get('/:id', TripController.getTripById);

router.put('/:id', authenticateToken, requireRole('fleet_operator'), TripController.updateTrip);

router.delete('/:id', authenticateToken, requireRole('fleet_operator'), TripController.deleteTrip);

module.exports = router;
