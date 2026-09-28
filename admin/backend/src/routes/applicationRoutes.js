const express = require('express');
const ApplicationController = require('../controllers/applicationController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, requireAdmin);

router.get('/', ApplicationController.listApplications);
router.get('/driver-routes', ApplicationController.getDriverRouteReport);

module.exports = router;
