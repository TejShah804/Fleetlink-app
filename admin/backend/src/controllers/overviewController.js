const StatsModel = require('../models/statsModel');

class OverviewController {
  /**
   * GET /api/admin/overview
   * Platform-wide counters, lane leaderboard and 6-month trend in one payload
   */
  static async getOverview(req, res, next) {
    try {
      const overview = await StatsModel.getOverview();

      return res.status(200).json({
        success: true,
        ...overview
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OverviewController;
