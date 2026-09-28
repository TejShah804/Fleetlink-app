const TripModel = require('../models/tripModel');
const { TRIP_STATUSES } = TripModel;

class TripController {
  /**
   * GET /api/admin/trips
   * Every transport with filters for status, transport owner, vehicle type and search
   */
  static async listTrips(req, res, next) {
    try {
      const { status, operator_id, vehicle_type, search } = req.query;

      const trips = await TripModel.listTrips({
        status,
        operator_id,
        vehicle_type: vehicle_type ? vehicle_type.trim() : undefined,
        search: search ? search.trim() : undefined
      });

      return res.status(200).json({
        success: true,
        count: trips.length,
        trips
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/trips/routes
   * Lane report — which source → destination pairs exist and their volume.
   * Declared before '/:id' so the literal path is not captured as an id.
   */
  static async getRouteReport(req, res, next) {
    try {
      const routes = await TripModel.getRouteReport({ limit: req.query.limit });

      return res.status(200).json({
        success: true,
        count: routes.length,
        routes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/trips/:id
   * One transport with the full applicant list
   */
  static async getTrip(req, res, next) {
    try {
      const result = await TripModel.getTripById(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Transport not found.'
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

  /**
   * PUT /api/admin/trips/:id/status
   * Admin moderation override for a transport status
   */
  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;

      if (!status || !TRIP_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `A valid status is required. Allowed values: [${TRIP_STATUSES.join(', ')}].`
        });
      }

      const updated = await TripModel.updateStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Transport not found.'
        });
      }

      const result = await TripModel.getTripById(req.params.id);

      return res.status(200).json({
        success: true,
        message: `Transport status updated to '${status}'.`,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TripController;
