const ApplicationModel = require('../models/applicationModel');
const TripModel = require('../models/tripModel');

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
      const trip = await TripModel.findById(tripId);
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
      const trip = await TripModel.findById(tripId);
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
   * Fleet operator accepts an applicant:
   * - Marks this application as 'accepted'
   * - Updates trip status to 'assigned'
   * - Automatically rejects other pending applicants for this trip
   */
  static async acceptApplication(req, res, next) {
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
          message: 'Forbidden: You can only accept applicants for trips that you posted.'
        });
      }

      // Check if application is pending
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot accept application with status '${application.status}'.`
        });
      }

      // Check if trip is still open
      if (application.trip_status !== 'open') {
        return res.status(400).json({
          success: false,
          message: `Trip is already in '${application.trip_status}' status. It cannot be assigned again.`
        });
      }

      // Execute transaction: accept this app, update trip to 'assigned', reject other applicants
      await ApplicationModel.acceptApplicationTransaction(applicationId, application.trip_id);

      return res.status(200).json({
        success: true,
        message: 'Applicant accepted successfully. Trip status has been updated to assigned, and other applications have been rejected.',
        application_id: applicationId,
        trip_id: application.trip_id,
        status: 'accepted'
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
