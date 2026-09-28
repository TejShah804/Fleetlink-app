const ApplicationModel = require('../models/applicationModel');

class ApplicationController {
  /**
   * GET /api/admin/applications
   * Every driver application, filterable by status, driver, transport owner or transport
   */
  static async listApplications(req, res, next) {
    try {
      const { status, driver_id, operator_id, trip_id, search } = req.query;

      const applications = await ApplicationModel.listApplications({
        status,
        driver_id,
        operator_id,
        trip_id,
        search: search ? search.trim() : undefined
      });

      return res.status(200).json({
        success: true,
        count: applications.length,
        applications
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/applications/driver-routes
   * Per-driver lane report built from accepted transports
   */
  static async getDriverRouteReport(req, res, next) {
    try {
      const routes = await ApplicationModel.getDriverRouteReport();

      return res.status(200).json({
        success: true,
        count: routes.length,
        routes
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApplicationController;
