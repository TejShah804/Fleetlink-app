const DriverModel = require('../models/driverModel');

class DriverController {
  /**
   * GET /api/admin/drivers
   * All owner drivers with application counts and lanes travelled
   */
  static async listDrivers(req, res, next) {
    try {
      const { search, sort } = req.query;

      const drivers = await DriverModel.listDrivers({
        search: search ? search.trim() : undefined,
        sort
      });

      return res.status(200).json({
        success: true,
        count: drivers.length,
        drivers
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/drivers/:id
   * One owner driver with every application they made and where it was for
   */
  static async getDriver(req, res, next) {
    try {
      const result = await DriverModel.getDriverById(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Owner driver not found.'
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

module.exports = DriverController;
