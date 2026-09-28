const express = require('express');
const DriverController = require('../controllers/driverController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, requireAdmin);

router.get('/', DriverController.listDrivers);
router.get('/:id', DriverController.getDriver);

module.exports = router;
