const ApplicationModel = require('../models/applicationModel');
const TripModel = require('../models/tripModel');
const NotificationModel = require('../models/notificationModel');
const { transitionHint } = require('../utils/tripLifecycle');

class ApplicationController {
  /**
   * POST /api/applications
   * Owner driver applies to an open trip
   */
  static async applyToTrip(req, res, next) {
    try {
      const { trip_id } = req.body;

      if (!trip_id) {
        return res.status(400).json({
          success: false,
          message: 'trip_id is required.'
        });
      }

      const tripId = parseInt(trip_id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'trip_id must be a valid integer.'
        });
      }

      // Check if trip exists
      // The public shape is enough here: a driver must not be able to read a
      // trip's contacts by probing ids before they are approved.
      const trip = await TripModel.findByIdPublic(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'The requested trip does not exist.'
        });
      }

      // Check if trip is still open
      if (trip.status !== 'open') {
        return res.status(400).json({
          success: false,
          message: `Cannot apply to this trip. Current trip status is '${trip.status}'.`
        });
      }

      // Check if driver has already applied to this trip
      const existingApp = await ApplicationModel.findByTripAndDriver(tripId, req.user.id);
      if (existingApp) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted an application for this trip.'
        });
      }

      const application = await ApplicationModel.createApplication({
        trip_id: tripId,
        owner_driver_id: req.user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully.',
        application
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted an application for this trip.'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/applications/my
   * Owner driver views their own applications with status & trip details
   */
  static async getMyApplications(req, res, next) {
    try {
      const applications = await ApplicationModel.getApplicationsByDriver(req.user.id);

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
   * GET /api/trips/:id/applicants
   * Fleet operator views all applicants for a specific trip they posted
   */
  static async getTripApplicants(req, res, next) {
    try {
      const tripId = parseInt(req.params.id, 10);
      if (isNaN(tripId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      // Verify trip exists
      const trip = await TripModel.findGuardColumns(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'Trip not found.'
        });
      }

      // Verify fleet operator owns this trip
      if (trip.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view applicants for trips that you posted.'
        });
      }

      const applicants = await ApplicationModel.getApplicantsByTrip(tripId);

      return res.status(200).json({
        success: true,
        trip_id: tripId,
        trip_status: trip.status,
        count: applicants.length,
        applicants
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/applications/:id/accept
   * Fleet operator approves an applicant. In one transaction:
   *   - trip → 'assigned', assigned_driver_id set
   *   - two random 4-digit OTPs, confirm_by = now + 2 hours
   *   - this application → accepted, other pending ones → rejected
   *   - a notification for the driver
   */
  static async acceptApplication(req, res, next) {
    try {
      const applicationId = parseInt(req.params.id, 10);
      if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application ID parameter.'
        });
      }

      const context = await ApplicationModel.getPendingContext(applicationId);
      if (!context) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.'
        });
      }

      if (context.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only accept applicants for trips that you posted.'
        });
      }

      if (context.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot accept an application with status '${context.status}'.`
        });
      }

      if (context.trip_status !== 'open') {
        return res.status(400).json({
          success: false,
          message: `This trip is already '${context.trip_status.replace(/_/g, ' ')}' and cannot be assigned again.`
        });
      }

      const result = await TripModel.assignTrip({
        trip_id: context.trip_id,
        application_id: applicationId,
        driver_id: context.owner_driver_id
      });

      if (!result.ok) {
        if (result.reason === 'not_found') {
          return res.status(404).json({
            success: false,
            message: 'Trip not found.'
          });
        }
        return res.status(409).json({
          success: false,
          message: `This trip is no longer open. ${transitionHint(result.from)}`
        });
      }

      const trip = await TripModel.findByIdForOperator(context.trip_id, req.user.id);

      await NotificationModel.create({
        user_id: context.owner_driver_id,
        trip_id: context.trip_id,
        message: `You are approved for trip #${trip.load_reference}. Confirm within 2 hours.`
      });

      return res.status(200).json({
        success: true,
        message: `Driver approved. Share the pickup OTP ${result.pickup_otp} and delivery OTP ${result.delivery_otp}. The driver has 2 hours to confirm.`,
        application_id: applicationId,
        trip_id: context.trip_id,
        status: 'accepted',
        pickup_otp: result.pickup_otp,
        delivery_otp: result.delivery_otp,
        confirm_by: result.confirm_by,
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/applications/:id/reject
   * Fleet operator rejects an applicant
   */
  static async rejectApplication(req, res, next) {
    try {
      const applicationId = parseInt(req.params.id, 10);
      if (isNaN(applicationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application ID parameter.'
        });
      }

      // Find application
      const application = await ApplicationModel.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.'
        });
      }

      // Verify fleet operator owns the trip
      if (application.fleet_operator_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only reject applicants for trips that you posted.'
        });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Application is already '${application.status}'.`
        });
      }

      const { rejection_reason } = req.body || {};
      const updated = await ApplicationModel.rejectApplication(
        applicationId,
        rejection_reason && rejection_reason.trim() ? rejection_reason.trim() : null
      );

      return res.status(200).json({
        success: true,
        message: 'Applicant rejected.',
        application: updated
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApplicationController;
