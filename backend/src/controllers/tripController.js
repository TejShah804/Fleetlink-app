const TripModel = require('../models/tripModel');

class TripController {
  /**
   * POST /api/trips
   * Fleet operator creates a new trip/load
   */
  static async createTrip(req, res, next) {
    try {
      const { load_reference, source, destination, vehicle_type, cargo_type, weight_tonnes, price } = req.body;

      if (!source || !destination || !vehicle_type || price === undefined || price === null) {
        return res.status(400).json({
          success: false,
          message: 'source, destination, vehicle_type, and price are required fields.'
        });
      }

      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number.'
        });
      }

      // Check unique load_reference if user passed one
      if (load_reference && load_reference.trim()) {
        const existing = await TripModel.findByReference(load_reference.trim());
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `A trip with Load Reference "${load_reference.trim()}" already exists. Please use a unique reference code.`
          });
        }
      }

      const newTrip = await TripModel.createTrip({
        fleet_operator_id: req.user.id,
        load_reference: load_reference ? load_reference.trim() : null,
        source: source.trim(),
        destination: destination.trim(),
        vehicle_type: vehicle_type.trim(),
        cargo_type: cargo_type ? cargo_type.trim() : null,
        weight_tonnes: weight_tonnes !== undefined && weight_tonnes !== '' && weight_tonnes !== null ? parseFloat(weight_tonnes) : null,
        price: numericPrice
      });

      return res.status(201).json({
        success: true,
        message: 'Trip posted successfully.',
        trip: newTrip
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'A trip with this Load Reference already exists. Please use a unique reference.'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/trips
   * List all open trips with optional query filters (source, destination, vehicle_type)
   * Browseable by owner drivers
   */
  static async getOpenTrips(req, res, next) {
    try {
      const { source, destination, vehicle_type } = req.query;

      const trips = await TripModel.getOpenTrips({
        source,
        destination,
        vehicle_type
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
   * GET /api/trips/my
   * Get all trips posted by the currently logged-in Fleet Operator
   */
  static async getMyTrips(req, res, next) {
    try {
      const trips = await TripModel.getTripsByOperator(req.user.id);

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
   * GET /api/trips/:id
   * Get single trip by ID
   */
  static async getTripById(req, res, next) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      const trip = await TripModel.findById(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'Trip not found.'
        });
      }

      return res.status(200).json({
        success: true,
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trips/:id
   * Fleet operator edits their own posted trip
   */
  static async updateTrip(req, res, next) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      const existingTrip = await TripModel.findById(tripId);
      if (!existingTrip) {
        return res.status(404).json({
          success: false,
          message: 'Trip not found.'
        });
      }

      // Verify ownership
      if (existingTrip.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only edit trips that you posted.'
        });
      }

      // Restrict editing completed or cancelled trips
      if (['completed', 'cancelled'].includes(existingTrip.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot edit a trip that is already ${existingTrip.status}.`
        });
      }

      const { load_reference, source, destination, vehicle_type, cargo_type, weight_tonnes, price } = req.body;

      // If user tries to change load_reference to one that belongs to another trip
      if (load_reference && load_reference.trim() && load_reference.trim() !== existingTrip.load_reference) {
        const conflict = await TripModel.findByReference(load_reference.trim());
        if (conflict && conflict.id !== tripId) {
          return res.status(409).json({
            success: false,
            message: `A trip with Load Reference "${load_reference.trim()}" already exists. Please use a unique reference code.`
          });
        }
      }

      const updatedTrip = await TripModel.updateTrip(tripId, {
        load_reference: load_reference ? load_reference.trim() : existingTrip.load_reference,
        source: source ? source.trim() : existingTrip.source,
        destination: destination ? destination.trim() : existingTrip.destination,
        vehicle_type: vehicle_type ? vehicle_type.trim() : existingTrip.vehicle_type,
        cargo_type: cargo_type !== undefined ? (cargo_type ? cargo_type.trim() : null) : existingTrip.cargo_type,
        weight_tonnes: weight_tonnes !== undefined && weight_tonnes !== '' && weight_tonnes !== null ? parseFloat(weight_tonnes) : existingTrip.weight_tonnes,
        price: price !== undefined ? parseFloat(price) : existingTrip.price
      });

      return res.status(200).json({
        success: true,
        message: 'Trip updated successfully.',
        trip: updatedTrip
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'A trip with this Load Reference already exists. Please use a unique reference.'
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/trips/:id
   * Fleet operator deletes their trip
   */
  static async deleteTrip(req, res, next) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      const existingTrip = await TripModel.findById(tripId);
      if (!existingTrip) {
        return res.status(404).json({
          success: false,
          message: 'Trip not found.'
        });
      }

      // Verify ownership
      if (existingTrip.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete trips that you posted.'
        });
      }

      await TripModel.deleteTrip(tripId);

      return res.status(200).json({
        success: true,
        message: 'Trip deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trips/:id/status
   * Fleet operator updates trip status (assigned -> in_progress -> completed, or cancelled)
   */
  static async updateTripStatus(req, res, next) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const { status } = req.body;

      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      const validStatuses = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: [${validStatuses.join(', ')}]`
        });
      }

      const existingTrip = await TripModel.findById(tripId);
      if (!existingTrip) {
        return res.status(404).json({
          success: false,
          message: 'Trip not found.'
        });
      }

      // Verify ownership
      if (existingTrip.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update the status of trips you posted.'
        });
      }

      const updatedTrip = await TripModel.updateStatus(tripId, status);

      return res.status(200).json({
        success: true,
        message: `Trip status updated to '${status}'.`,
        trip: updatedTrip
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TripController;
