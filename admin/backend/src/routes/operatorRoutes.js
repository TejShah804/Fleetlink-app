const express = require('express');
const OperatorController = require('../controllers/operatorController');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin, requireAdmin);

router.get('/', OperatorController.listOperators);
router.get('/:id', OperatorController.getOperator);

module.exports = router;
