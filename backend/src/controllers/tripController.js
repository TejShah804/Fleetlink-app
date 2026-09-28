const TripModel = require('../models/tripModel');
const RatingModel = require('../models/ratingModel');
const NotificationModel = require('../models/notificationModel');
const { proofUpload, proofPublicPath, removeProof } = require('../middleware/upload');
const {
  TRIP_STATUSES,
  DRIVER_UPDATE_TYPES,
  MAX_OTP_ATTEMPTS,
  canTransition,
  transitionHint,
  isConfirmExpired,
  isIndianPhone,
  whatsappOtpLink
} = require('../utils/tripLifecycle');

const PAYMENT_METHODS = ['online', 'cash', 'net_banking', 'bank_transfer'];

/** Today in the server's local timezone, as YYYY-MM-DD. */
function todayISODate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** YYYY-MM-DD that is also a real calendar date, so 2026-02-31 is rejected. */
function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 24-hour HH:MM or HH:MM:SS. */
function isTime(value) {
  if (typeof value !== 'string') return false;
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

/** Parse a :id param, or null when it is not a positive integer. */
function parseTripId(raw) {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Validate a trip payload. Returns a field-keyed object of problems so the
 * client can render each message under its own input; empty means valid.
 *
 * `skipPastCheck` is used when editing a trip whose pickup date is unchanged —
 * its date has simply aged past, and that should not block unrelated edits.
 */
function validateTrip(data, { skipPastCheck = false } = {}) {
  const errors = {};

  const source = (data.source || '').trim();
  const destination = (data.destination || '').trim();

  if (!source) {
    errors.source = 'From (source) is required.';
  }
  if (!destination) {
    errors.destination = 'To (destination) is required.';
  } else if (source && source.toLowerCase() === destination.toLowerCase()) {
    errors.destination = 'Source and destination must be different.';
  }

  if (!data.vehicle_type || !String(data.vehicle_type).trim()) {
    errors.vehicle_type = 'Vehicle type is required.';
  }

  if (data.price === undefined || data.price === null || data.price === '') {
    errors.price = 'Price is required.';
  } else {
    const price = Number(data.price);
    if (Number.isNaN(price)) {
      errors.price = 'Price must be a number.';
    } else if (price <= 0) {
      errors.price = 'Price must be greater than 0.';
    }
  }

  if (data.weight_tonnes !== undefined && data.weight_tonnes !== null && data.weight_tonnes !== '') {
    const weight = Number(data.weight_tonnes);
    if (Number.isNaN(weight)) {
      errors.weight_tonnes = 'Weight must be a number.';
    } else if (weight <= 0) {
      errors.weight_tonnes = 'Weight must be greater than 0 tonnes.';
    }
  }

  if (!data.pickup_date) {
    errors.pickup_date = 'Pickup date is required.';
  } else if (!isISODate(data.pickup_date)) {
    errors.pickup_date = 'Pickup date must be a valid date.';
  } else if (!skipPastCheck && data.pickup_date < todayISODate()) {
    errors.pickup_date = 'Pickup date cannot be in the past.';
  }

  if (!data.pickup_time) {
    errors.pickup_time = 'Pickup time is required.';
  } else if (!isTime(data.pickup_time)) {
    errors.pickup_time = 'Pickup time must be a valid time.';
  }

  if (!data.delivery_date) {
    errors.delivery_date = 'Delivery date is required.';
  } else if (!isISODate(data.delivery_date)) {
    errors.delivery_date = 'Delivery date must be a valid date.';
  } else if (isISODate(data.pickup_date) && data.delivery_date < data.pickup_date) {
    errors.delivery_date = 'Delivery date must be on or after the pickup date.';
  }

  if (!data.payment_method) {
    errors.payment_method = 'Payment method is required.';
  } else if (!PAYMENT_METHODS.includes(data.payment_method)) {
    errors.payment_method = `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`;
  }

  // ── Privacy / contact details ───────────────────────────────────────────
  const pickupAddress = (data.pickup_address || '').trim();
  if (!pickupAddress) {
    errors.pickup_address = 'Pickup address is required.';
  }

  if (!(data.pickup_contact_name || '').trim()) {
    errors.pickup_contact_name = 'Pickup contact name is required.';
  }

  const pickupPhone = (data.pickup_contact_phone || '').trim();
  if (!pickupPhone) {
    errors.pickup_contact_phone = 'Pickup contact phone is required.';
  } else if (!isIndianPhone(pickupPhone)) {
    errors.pickup_contact_phone = 'Enter a valid 10-digit Indian mobile number (starts 6-9).';
  }

  const receiverName = (data.receiver_name || '').trim();
  if (!receiverName) {
    errors.receiver_name = 'Receiver name is required.';
  }

  const receiverPhone = (data.receiver_phone || '').trim();
  if (!receiverPhone) {
    errors.receiver_phone = 'Receiver phone is required.';
  } else if (!isIndianPhone(receiverPhone)) {
    errors.receiver_phone = 'Enter a valid 10-digit Indian mobile number (starts 6-9).';
  }

  // delivery_address is optional — the driver is told to call the receiver
  return errors;
}

class TripController {
  /**
   * Load a trip and assert the caller is its operator.
   * Returns either { trip } or a ready-to-send error object.
   */
  static async requireOwnedTrip(req, res) {
    const tripId = parseTripId(req.params.id);
    if (tripId === null) {
      return {
        error: res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        })
      };
    }

    const guard = await TripModel.findGuardColumns(tripId);
    if (!guard) {
      return {
        error: res.status(404).json({ success: false, message: 'Trip not found.' })
      };
    }

    if (guard.fleet_operator_id !== req.user.id) {
      return {
        error: res.status(403).json({
          success: false,
          message: 'Forbidden: You can only act on trips that you posted.'
        })
      };
    }

    return { tripId, guard };
  }

  /** Load a trip and assert the caller is its currently assigned driver. */
  static async requireAssignedDriver(req, res, { statuses = null } = {}) {
    const tripId = parseTripId(req.params.id);
    if (tripId === null) {
      return {
        error: res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        })
      };
    }

    const guard = await TripModel.findGuardColumns(tripId);
    if (!guard) {
      return {
        error: res.status(404).json({ success: false, message: 'Trip not found.' })
      };
    }

    if (guard.assigned_driver_id !== req.user.id) {
      return {
        error: res.status(403).json({
          success: false,
          message: 'Forbidden: Only the driver assigned to this trip can do that.'
        })
      };
    }

    if (statuses && !statuses.includes(guard.status)) {
      return {
        error: res.status(400).json({
          success: false,
          message: `This action needs the trip to be ${statuses.join(' or ')}. ${transitionHint(guard.status)}`
        })
      };
    }

    return { tripId, guard };
  }

  // ── Reference ─────────────────────────────────────────────────────────────

  /**
   * GET /api/trips/generate-reference
   * A load reference that is not already taken, for the refresh icon in the form.
   */
  static async generateReference(req, res, next) {
    try {
      const load_reference = await TripModel.generateUniqueReference();
      return res.status(200).json({ success: true, load_reference });
    } catch (error) {
      next(error);
    }
  }

  // ── Create / update / delete ──────────────────────────────────────────────

  /**
   * POST /api/trips
   * Fleet operator creates a new trip/load
   */
  static async createTrip(req, res, next) {
    try {
      const {
        load_reference,
        source,
        destination,
        vehicle_type,
        cargo_type,
        weight_tonnes,
        price,
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        notes,
        pickup_address,
        pickup_contact_name,
        pickup_contact_phone,
        delivery_address,
        receiver_name,
        receiver_phone
      } = req.body;

      const errors = validateTrip({
        source,
        destination,
        vehicle_type,
        price,
        weight_tonnes,
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        pickup_address,
        pickup_contact_name,
        pickup_contact_phone,
        receiver_name,
        receiver_phone
      });

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Please correct the highlighted fields.',
          errors
        });
      }

      const trimmedReference = load_reference ? load_reference.trim() : null;
      if (trimmedReference) {
        const existing = await TripModel.findByReference(trimmedReference);
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Load reference already exists.',
            errors: {
              load_reference: 'Load reference already exists. Use the refresh icon to generate a new one.'
            }
          });
        }
      }

      const newTrip = await TripModel.createTrip({
        fleet_operator_id: req.user.id,
        load_reference: trimmedReference,
        source: source.trim(),
        destination: destination.trim(),
        vehicle_type: vehicle_type.trim(),
        cargo_type: cargo_type && String(cargo_type).trim() ? String(cargo_type).trim() : 'General Goods',
        weight_tonnes:
          weight_tonnes === undefined || weight_tonnes === null || weight_tonnes === ''
            ? null
            : parseFloat(weight_tonnes),
        price: parseFloat(price),
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        notes: notes && String(notes).trim() ? String(notes).trim() : null,
        pickup_address: pickup_address.trim(),
        pickup_contact_name: pickup_contact_name.trim(),
        pickup_contact_phone: pickup_contact_phone.trim(),
        delivery_address: delivery_address && String(delivery_address).trim()
          ? String(delivery_address).trim()
          : null,
        receiver_name: receiver_name.trim(),
        receiver_phone: receiver_phone.trim()
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
          message: 'Load reference already exists.',
          errors: {
            load_reference: 'Load reference already exists. Use the refresh icon to generate a new one.'
          }
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/trips
   * Browse open trips. Unauthenticated, so it returns cities and schedule
   * only — never addresses, contacts, receiver details or OTPs.
   */
  static async getOpenTrips(req, res, next) {
    try {
      const { source, destination, vehicle_type, payment_method, pickup_date } = req.query;

      if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment_method filter. Must be one of: ${PAYMENT_METHODS.join(', ')}.`
        });
      }

      const trips = await TripModel.getOpenTrips({
        source,
        destination,
        vehicle_type,
        payment_method,
        pickup_date
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
   * The operator's own trips, including OTPs and the no_update_alert flag.
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
   * GET /api/trips/active
   * The signed-in driver's live trips. No OTPs, ever.
   */
  static async getActiveTrips(req, res, next) {
    try {
      const trips = await TripModel.getActiveTripsForDriver(req.user.id);
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
   *
   * Full details, but only to the trip's operator, or to the assigned driver
   * once the trip is 'confirmed'. Anyone else gets a reduced public view so a
   * shared link cannot be used to read a load's contacts.
   */
  static async getTripById(req, res, next) {
    try {
      const tripId = parseTripId(req.params.id);
      if (tripId === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      // No token on a public route: fall back to the public shape
      const user = req.user;
      if (!user) {
        const publicTrip = await TripModel.findByIdPublic(tripId);
        if (!publicTrip) {
          return res.status(404).json({ success: false, message: 'Trip not found.' });
        }
        return res.status(200).json({
          success: true,
          trip: publicTrip,
          access: 'public'
        });
      }

      if (user.role === 'fleet_operator') {
        const trip = await TripModel.findByIdForOperator(tripId, user.id);
        if (!trip) {
          // Either it does not exist, or it belongs to someone else — a
          // different message would confirm the id exists to a stranger.
          return res.status(404).json({
            success: false,
            message: 'Trip not found or not posted by you.'
          });
        }
        return res.status(200).json({ success: true, trip, access: 'operator' });
      }

      if (user.role === 'owner_driver') {
        const guard = await TripModel.findGuardColumns(tripId);
        if (!guard) {
          return res.status(404).json({ success: false, message: 'Trip not found.' });
        }

        const isAssigned = guard.assigned_driver_id === user.id;
        const detailVisible = isAssigned && guard.status !== 'assigned';

        if (detailVisible) {
          const trip = await TripModel.findByIdForDriver(tripId, user.id);
          return res.status(200).json({ success: true, trip, access: 'driver' });
        }

        // Assigned but not yet confirmed: show schedule so the driver knows
        // what they are confirming, without the addresses.
        const summary = await TripModel.findByIdPublic(tripId);
        return res.status(200).json({
          success: true,
          trip: summary,
          access: isAssigned ? 'driver_pending' : 'public',
          message: isAssigned
            ? 'Confirm this trip to see the full address and contact details.'
            : undefined
        });
      }

      // Any other authenticated role (e.g. admin) gets the public shape
      const publicTrip = await TripModel.findByIdPublic(tripId);
      if (!publicTrip) {
        return res.status(404).json({ success: false, message: 'Trip not found.' });
      }
      return res.status(200).json({ success: true, trip: publicTrip, access: 'public' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trips/:id
   * Fleet operator edits their own posted trip.
   */
  static async updateTrip(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId } = owned;

      const existingTrip = await TripModel.findByIdForOperator(tripId, req.user.id);

      if (['completed', 'cancelled', 'delivered'].includes(existingTrip.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot edit a trip that is already ${existingTrip.status.replace(/_/g, ' ')}.`
        });
      }

      const {
        load_reference,
        source,
        destination,
        vehicle_type,
        cargo_type,
        weight_tonnes,
        price,
        pickup_date,
        pickup_time,
        delivery_date,
        payment_method,
        notes,
        pickup_address,
        pickup_contact_name,
        pickup_contact_phone,
        delivery_address,
        receiver_name,
        receiver_phone
      } = req.body;

      // Merge over the stored trip so a partial PUT stays valid
      const merged = {
        source: source !== undefined ? source.trim() : existingTrip.source,
        destination: destination !== undefined ? destination.trim() : existingTrip.destination,
        vehicle_type: vehicle_type !== undefined ? vehicle_type.trim() : existingTrip.vehicle_type,
        cargo_type: cargo_type !== undefined ? cargo_type : existingTrip.cargo_type,
        weight_tonnes: weight_tonnes !== undefined ? weight_tonnes : existingTrip.weight_tonnes,
        price: price !== undefined ? price : existingTrip.price,
        pickup_date: pickup_date !== undefined ? pickup_date : existingTrip.pickup_date,
        pickup_time: pickup_time !== undefined ? pickup_time : existingTrip.pickup_time,
        delivery_date: delivery_date !== undefined ? delivery_date : existingTrip.delivery_date,
        payment_method: payment_method !== undefined ? payment_method : existingTrip.payment_method,
        pickup_address: pickup_address !== undefined ? pickup_address.trim() : existingTrip.pickup_address,
        pickup_contact_name: pickup_contact_name !== undefined
          ? pickup_contact_name.trim()
          : existingTrip.pickup_contact_name,
        pickup_contact_phone: pickup_contact_phone !== undefined
          ? pickup_contact_phone.trim()
          : existingTrip.pickup_contact_phone,
        delivery_address: delivery_address !== undefined
          ? (String(delivery_address).trim() ? String(delivery_address).trim() : null)
          : existingTrip.delivery_address,
        receiver_name: receiver_name !== undefined ? receiver_name.trim() : existingTrip.receiver_name,
        receiver_phone: receiver_phone !== undefined ? receiver_phone.trim() : existingTrip.receiver_phone
      };

      const pickupDateChanged = merged.pickup_date !== existingTrip.pickup_date;

      const errors = validateTrip(merged, { skipPastCheck: !pickupDateChanged });
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Please correct the highlighted fields.',
          errors
        });
      }

      const nextReference = load_reference ? load_reference.trim() : null;
      if (nextReference && nextReference !== existingTrip.load_reference) {
        const conflict = await TripModel.findByReference(nextReference);
        if (conflict && conflict.id !== tripId) {
          return res.status(409).json({
            success: false,
            message: 'Load reference already exists.',
            errors: {
              load_reference: 'Load reference already exists. Use the refresh icon to generate a new one.'
            }
          });
        }
      }

      await TripModel.updateTrip(tripId, {
        load_reference: nextReference || existingTrip.load_reference,
        source: merged.source,
        destination: merged.destination,
        vehicle_type: merged.vehicle_type,
        cargo_type: merged.cargo_type ? String(merged.cargo_type).trim() : 'General Goods',
        weight_tonnes:
          merged.weight_tonnes === undefined || merged.weight_tonnes === null || merged.weight_tonnes === ''
            ? null
            : parseFloat(merged.weight_tonnes),
        price: parseFloat(merged.price),
        pickup_date: merged.pickup_date,
        pickup_time: merged.pickup_time,
        delivery_date: merged.delivery_date,
        payment_method: merged.payment_method,
        notes: notes !== undefined
          ? (notes && String(notes).trim() ? String(notes).trim() : null)
          : existingTrip.notes,
        pickup_address: merged.pickup_address,
        pickup_contact_name: merged.pickup_contact_name,
        pickup_contact_phone: merged.pickup_contact_phone,
        delivery_address: merged.delivery_address,
        receiver_name: merged.receiver_name,
        receiver_phone: merged.receiver_phone
      });

      const updatedTrip = await TripModel.findByIdForOperator(tripId, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Trip updated successfully.',
        trip: updatedTrip
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Load reference already exists.',
          errors: {
            load_reference: 'Load reference already exists. Use the refresh icon to generate a new one.'
          }
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/trips/:id
   */
  static async deleteTrip(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;

      await TripModel.deleteTrip(owned.tripId);
      return res.status(200).json({ success: true, message: 'Trip deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ── Lifecycle: driver confirms ────────────────────────────────────────────

  /**
   * PUT /api/trips/:id/confirm
   * The assigned driver accepts the job. Must happen before confirm_by, after
   * which the operator is expected to reassign.
   */
  static async confirmTrip(req, res, next) {
    try {
      const owned = await TripController.requireAssignedDriver(req, res, { statuses: ['assigned'] });
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (isConfirmExpired(guard.confirm_by)) {
        return res.status(400).json({
          success: false,
          message: 'The 2-hour confirmation window has passed. The operator can now reassign this trip.'
        });
      }

      const updated = await TripModel.confirmAssignment(tripId);
      if (!updated) {
        return res.status(409).json({
          success: false,
          message: 'This trip changed while you were confirming. Reload and try again.'
        });
      }

      await TripModel.addUpdate({
        trip_id: tripId,
        driver_id: req.user.id,
        type: 'checkpoint',
        message: 'Driver confirmed the trip'
      });

      const trip = await TripModel.findByIdForDriver(tripId, req.user.id);
      await NotificationModel.create({
        user_id: trip.fleet_operator_id,
        trip_id: tripId,
        message: `${trip.driver_name || 'Your driver'} confirmed trip #${trip.load_reference}.`
      });

      return res.status(200).json({
        success: true,
        message: 'Trip confirmed. The pickup details are now unlocked.',
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Lifecycle: reassign ───────────────────────────────────────────────────

  /**
   * POST /api/trips/:id/reassign
   * Only valid while a driver sits on the job without confirming. Reopens the
   * trip and lets the operator pick someone else.
   */
  static async reassignTrip(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (guard.status !== 'assigned') {
        return res.status(400).json({
          success: false,
          message: `Only a trip awaiting driver confirmation can be reassigned. ${transitionHint(guard.status)}`
        });
      }

      if (!guard.assigned_driver_id) {
        return res.status(400).json({
          success: false,
          message: 'This trip has no assigned driver to reassign.'
        });
      }

      // A driver who confirmed in time keeps the job
      if (!isConfirmExpired(guard.confirm_by)) {
        return res.status(400).json({
          success: false,
          message: 'The driver is still within their confirmation window. Try again after it expires.'
        });
      }

      const trip = await TripModel.findByIdForOperator(tripId, req.user.id);
      await TripModel.reopenTrip(tripId);

      await NotificationModel.create({
        user_id: guard.assigned_driver_id,
        trip_id: tripId,
        message: `Trip #${trip.load_reference} was reassigned — you did not confirm within 2 hours.`
      });

      await NotificationModel.create({
        user_id: req.user.id,
        trip_id: tripId,
        message: `Trip #${trip.load_reference} is open again after ${trip.driver_name || 'the driver'} missed the confirmation window.`
      });

      const reopened = await TripModel.findByIdForOperator(tripId, req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Trip reopened. You can now approve another driver.',
        trip: reopened
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Lifecycle: driver milestones ─────────────────────────────────────────

  /**
   * POST /api/trips/:id/updates
   * The driver logs progress. Only the four hand-reported milestone types are
   * accepted here; 'loaded' and 'delivered' are written by the OTP handlers so
   * the timeline cannot be forged.
   */
  static async addUpdate(req, res, next) {
    try {
      const owned = await TripController.requireAssignedDriver(req, res, {
        statuses: ['confirmed', 'in_transit']
      });
      if (owned.error) return owned.error;
      const { tripId } = owned;

      const { type, message } = req.body || {};

      if (!type || !DRIVER_UPDATE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Update type must be one of: ${DRIVER_UPDATE_TYPES.join(', ')}.`
        });
      }

      const trimmedMessage = message && String(message).trim() ? String(message).trim() : null;
      if (trimmedMessage && trimmedMessage.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Update message must be 255 characters or fewer.'
        });
      }

      const update = await TripModel.addUpdate({
        trip_id: tripId,
        driver_id: req.user.id,
        type,
        message: trimmedMessage
      });

      const trip = await TripModel.findByIdForDriver(tripId, req.user.id);
      await NotificationModel.create({
        user_id: trip.fleet_operator_id,
        trip_id: tripId,
        message: `Update on trip #${trip.load_reference}: ${type.replace(/_/g, ' ')}.`
      });

      return res.status(201).json({
        success: true,
        message: 'Update recorded.',
        update
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trips/:id/timeline
   * Newest first. Operator or assigned driver only.
   */
  static async getTimeline(req, res, next) {
    try {
      const tripId = parseTripId(req.params.id);
      if (tripId === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trip ID parameter.'
        });
      }

      const guard = await TripModel.findGuardColumns(tripId);
      if (!guard) {
        return res.status(404).json({ success: false, message: 'Trip not found.' });
      }

      const isOperator = req.user.role === 'fleet_operator' && guard.fleet_operator_id === req.user.id;
      const isDriver = req.user.role === 'owner_driver' && guard.assigned_driver_id === req.user.id;

      if (!isOperator && !isDriver) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the operator or the assigned driver can view this timeline.'
        });
      }

      const updates = await TripModel.getTimeline(tripId);
      return res.status(200).json({
        success: true,
        count: updates.length,
        updates
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Lifecycle: OTP verification ───────────────────────────────────────────

  /**
   * Shared OTP check. Returns { ok } or { error, response, uploaded } so both
   * the pickup and delivery handlers can clean up their own uploads.
   */
  static async checkOtp({ tripId, column, providedOtp, res, guard }) {
    const otp = String(providedOtp || '').trim();

    if (!/^\d{4}$/.test(otp)) {
      return {
        ok: false,
        res,
        response: res.status(400).json({
          success: false,
          message: 'Enter the 4-digit OTP you were given.'
        })
      };
    }

    const trip = await TripModel.findByIdForOperator(tripId, guard.fleet_operator_id);
    const expected = trip ? trip[column] : null;

    if (!expected) {
      return {
        ok: false,
        res,
        response: res.status(400).json({
          success: false,
          message: 'No OTP has been issued for this trip yet.'
        })
      };
    }

    if (otp === expected) return { ok: true };

    const attempts = await TripModel.recordOtpFailure(tripId);
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts);

    // Tell the operator the moment the driver burns the last attempt, so a
    // stuck driver is not silently blocking the load.
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await NotificationModel.create({
        user_id: guard.fleet_operator_id,
        trip_id: tripId,
        message: `Driver failed the ${column === 'pickup_otp' ? 'pickup' : 'delivery'} OTP ${MAX_OTP_ATTEMPTS} times on trip #${trip.load_reference}. The load is now locked.`
      });
    }

    return {
      ok: false,
      res,
      response: res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : `Incorrect OTP. The trip is now locked after ${MAX_OTP_ATTEMPTS} failed attempts.`,
        attempts_remaining: remaining,
        locked: remaining === 0
      })
    };
  }

  /**
   * POST /api/trips/:id/verify-pickup  { otp }
   * Correct code → the load is 'loaded' on the timeline and the trip goes
   * in_transit.
   */
  static async verifyPickup(req, res, next) {
    try {
      const owned = await TripController.requireAssignedDriver(req, res, { statuses: ['confirmed'] });
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      const result = await TripController.checkOtp({
        tripId,
        column: 'pickup_otp',
        providedOtp: req.body.otp,
        res,
        guard
      });
      if (!result.ok) return result.response;

      const moved = await TripModel.markInTransit(tripId);
      if (!moved) {
        return res.status(409).json({
          success: false,
          message: 'This trip changed while you were verifying. Reload and try again.'
        });
      }

      await TripModel.addUpdate({
        trip_id: tripId,
        driver_id: req.user.id,
        type: 'loaded',
        message: 'Pickup verified with OTP, load collected'
      });

      const trip = await TripModel.findByIdForDriver(tripId, req.user.id);
      await NotificationModel.create({
        user_id: trip.fleet_operator_id,
        trip_id: tripId,
        message: `Load collected on trip #${trip.load_reference}. The vehicle is in transit.`
      });

      return res.status(200).json({
        success: true,
        message: 'Pickup verified. The load is now in transit.',
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips/:id/verify-delivery
   * multipart/form-data: otp (text) + proof (optional file).
   * Correct code → status 'delivered', delivered_at and delivery_proof_url set.
   */
  static async verifyDelivery(req, res, next) {
    // Only the OTP value is read; the file has already been written to disk
    // by the multer middleware.
    const uploadedPath = req.file ? proofPublicPath(req.file.filename) : null;

    try {
      const owned = await TripController.requireAssignedDriver(req, res, { statuses: ['in_transit'] });
      if (owned.error) {
        removeProof(uploadedPath);
        return owned.error;
      }
      const { tripId, guard } = owned;

      const result = await TripController.checkOtp({
        tripId,
        column: 'delivery_otp',
        // multipart bodies arrive as strings, so no JSON parse is needed
        providedOtp: req.body.otp,
        res,
        guard
      });

      if (!result.ok) {
        // The OTP was wrong, so the photo is not a valid proof of anything
        removeProof(uploadedPath);
        return result.response;
      }

      const delivered = await TripModel.markDelivered(tripId, uploadedPath);
      if (!delivered) {
        removeProof(uploadedPath);
        return res.status(409).json({
          success: false,
          message: 'This trip changed while you were verifying. Reload and try again.'
        });
      }

      await TripModel.addUpdate({
        trip_id: tripId,
        driver_id: req.user.id,
        type: 'delivered',
        message: uploadedPath ? 'Delivered with OTP, proof photo attached' : 'Delivered, OTP verified'
      });

      const trip = await TripModel.findByIdForDriver(tripId, req.user.id);
      await NotificationModel.create({
        user_id: trip.fleet_operator_id,
        trip_id: tripId,
        message: `Trip #${trip.load_reference} was delivered. Confirm delivery to close the job.`
      });

      return res.status(200).json({
        success: true,
        message: 'Delivery verified. Waiting for the operator to confirm.',
        trip
      });
    } catch (error) {
      removeProof(uploadedPath);
      next(error);
    }
  }

  // ── Lifecycle: operator sign-off ──────────────────────────────────────────

  /**
   * PUT /api/trips/:id/confirm-delivery
   * Operator accepts the delivery proof and closes the job.
   */
  static async confirmDelivery(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (guard.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: `Only a delivered trip can be confirmed. ${transitionHint(guard.status)}`
        });
      }

      const completed = await TripModel.markCompleted(tripId);
      if (!completed) {
        return res.status(409).json({
          success: false,
          message: 'This trip changed while you were confirming. Reload and try again.'
        });
      }

      const trip = await TripModel.findByIdForOperator(tripId, req.user.id);
      if (guard.assigned_driver_id) {
        await NotificationModel.create({
          user_id: guard.assigned_driver_id,
          trip_id: tripId,
          message: `Delivery confirmed for trip #${trip.load_reference}. The job is complete.`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery confirmed. Trip is now completed.',
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trips/:id/payment
   * Only after completion. The trip's own payment_method is echoed back so
   * the operator's "Mark as Paid" button can name the method.
   */
  static async markPaymentPaid(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (guard.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: `Payment can only be marked after the trip is completed. ${transitionHint(guard.status)}`
        });
      }

      const paid = await TripModel.markPaymentPaid(tripId);
      if (!paid) {
        return res.status(409).json({
          success: false,
          message: 'This trip changed while you were saving. Reload and try again.'
        });
      }

      const trip = await TripModel.findByIdForOperator(tripId, req.user.id);
      return res.status(200).json({
        success: true,
        message: `Payment marked as paid via ${trip.payment_method.replace(/_/g, ' ')}.`,
        trip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trips/:id/rating
   * The rating for a trip, so the operator's form can render the existing
   * rating as read-only instead of re-submitting and hitting a 409.
   */
  static async getTripRating(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId } = owned;

      const rating = await RatingModel.findByTrip(tripId);
      return res.status(200).json({
        success: true,
        rating: rating || null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips/:id/rating  { stars, comment }
   * One rating per trip, only once the trip is completed and paid.
   */
  static async rateTrip(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (guard.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: `You can rate a driver only after the trip is completed. ${transitionHint(guard.status)}`
        });
      }

      if (!guard.assigned_driver_id) {
        return res.status(400).json({
          success: false,
          message: 'This trip has no driver to rate.'
        });
      }

      const { stars, comment } = req.body || {};
      const starCount = Number(stars);

      if (!Number.isInteger(starCount) || starCount < 1 || starCount > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a whole number from 1 to 5 stars.'
        });
      }

      const trimmedComment = comment && String(comment).trim() ? String(comment).trim() : null;
      if (trimmedComment && trimmedComment.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Review comment must be 500 characters or fewer.'
        });
      }

      const existing = await RatingModel.findByTrip(tripId);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `You have already rated this trip ${existing.stars} star${existing.stars === 1 ? '' : 's'}.`
        });
      }

      try {
        const rating = await RatingModel.create({
          trip_id: tripId,
          operator_id: req.user.id,
          driver_id: guard.assigned_driver_id,
          stars: starCount,
          comment: trimmedComment
        });

        await NotificationModel.create({
          user_id: guard.assigned_driver_id,
          trip_id: tripId,
          message: `You received ${starCount} star${starCount === 1 ? '' : 's'} for trip #${guard.id}.`
        });

        return res.status(201).json({
          success: true,
          message: 'Thanks for rating this trip.',
          rating
        });
      } catch (error) {
        // UNIQUE(trip_id) fired: a parallel request won the race
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            success: false,
            message: 'You have already rated this trip.'
          });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trips/:id/otp-links
   * WhatsApp deep links for sharing each OTP with the right contact. Operator
   * only, and the only place besides the trip list that exposes the codes.
   */
  static async getOtpLinks(req, res, next) {
    try {
      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId } = owned;

      const trip = await TripModel.findByIdForOperator(tripId, req.user.id);
      if (!trip.pickup_otp || !trip.delivery_otp) {
        return res.status(400).json({
          success: false,
          message: 'OTPs are generated when you approve a driver.'
        });
      }

      const reference = trip.load_reference;

      return res.status(200).json({
        success: true,
        pickup_otp: trip.pickup_otp,
        delivery_otp: trip.delivery_otp,
        pickup_contact_phone: trip.pickup_contact_phone,
        receiver_phone: trip.receiver_phone,
        pickup_whatsapp_url: whatsappOtpLink(
          trip.pickup_contact_phone,
          `Hello ${trip.pickup_contact_name}, this is ${trip.operator_company || trip.operator_name}. Your pickup OTP for load ${reference} is ${trip.pickup_otp}. Please share it with the driver at pickup.`
        ),
        delivery_whatsapp_url: whatsappOtpLink(
          trip.receiver_phone,
          `Hello ${trip.receiver_name}, this is ${trip.operator_company || trip.operator_name}. Your delivery OTP for load ${reference} is ${trip.delivery_otp}. Please share it with the driver at delivery.`
        )
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Status (kept, now lifecycle-aware) ────────────────────────────────────

  /**
   * PUT /api/trips/:id/status
   * Fleet operator drives the statuses that do not have a dedicated endpoint.
   * Transitions that belong to the driver are refused so the OTP flow cannot
   * be bypassed.
   */
  static async updateTripStatus(req, res, next) {
    try {
      const { status } = req.body || {};

      if (!status || !TRIP_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${TRIP_STATUSES.join(', ')}.`
        });
      }

      // These move only through their own endpoints, which enforce OTP proof
      if (['assigned', 'confirmed', 'in_transit', 'delivered', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Use the approve, confirm, OTP and sign-off endpoints to move a trip through these statuses.'
        });
      }

      const owned = await TripController.requireOwnedTrip(req, res);
      if (owned.error) return owned.error;
      const { tripId, guard } = owned;

      if (!canTransition(guard.status, status)) {
        return res.status(400).json({
          success: false,
          message: transitionHint(guard.status)
        });
      }

      // 'cancelled' is the only status reachable from here — the guard above
      // blocks everything else, so this call is unambiguous.
      await TripModel.cancelTrip(tripId);

      if (guard.assigned_driver_id) {
        await NotificationModel.create({
          user_id: guard.assigned_driver_id,
          trip_id: tripId,
          message: `Trip #${guard.id} was cancelled by the operator.`
        });
      }

      const trip = await TripModel.findByIdForOperator(tripId, req.user.id);
      return res.status(200).json({
        success: true,
        message: `Trip status updated to '${status}'.`,
        trip
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TripController;
