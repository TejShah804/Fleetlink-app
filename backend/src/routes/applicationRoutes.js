const express = require('express');
const ApplicationController = require('../controllers/applicationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Owner Driver routes
router.post(
  '/',
  authenticateToken,
  requireRole('owner_driver'),
  ApplicationController.applyToTrip
);

router.get(
  '/my',
  authenticateToken,
  requireRole('owner_driver'),
  ApplicationController.getMyApplications
);

// Fleet Operator routes
router.put(
  '/:id/accept',
  authenticateToken,
  requireRole('fleet_operator'),
  ApplicationController.acceptApplication
);

router.put(
  '/:id/reject',
  authenticateToken,
  requireRole('fleet_operator'),
  ApplicationController.rejectApplication
);

module.exports = router;
