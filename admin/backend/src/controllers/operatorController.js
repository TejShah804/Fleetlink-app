const OperatorModel = require('../models/operatorModel');

class OperatorController {
  /**
   * GET /api/admin/operators
   * All transport owners with transport counts, value and applicant totals
   */
  static async listOperators(req, res, next) {
    try {
      const { search, sort } = req.query;

      const operators = await OperatorModel.listOperators({
        search: search ? search.trim() : undefined,
        sort
      });

      return res.status(200).json({
        success: true,
        count: operators.length,
        operators
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/operators/:id
   * One transport owner with all of their transports and top lanes
   */
  static async getOperator(req, res, next) {
    try {
      const result = await OperatorModel.getOperatorById(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Transport owner not found.'
        });
      }

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OperatorController;
