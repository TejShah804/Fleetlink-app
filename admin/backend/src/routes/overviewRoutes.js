const express = require('express');
const OverviewController = require('../controllers/overviewController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, requireAdmin);

router.get('/overview', OverviewController.getOverview);

module.exports = router;
