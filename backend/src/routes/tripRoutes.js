const express = require('express');
const TripController = require('../controllers/tripController');
const ApplicationController = require('../controllers/applicationController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { proofUpload } = require('../middleware/upload');

const router = express.Router();

/**
 * Route order matters here. Express matches in declaration order, so the
 * single-segment static paths ('/my', '/generate-reference', '/active') are
 * all registered before the '/:id' pattern — otherwise 'active' is read as an
 * id and the driver endpoint 400s.
 *
 * Two-segment paths such as '/:id/timeline' are unaffected by that and can sit
 * wherever they read best.
 */

// ── Public browse ─────────────────────────────────────────────────────────
/**
 * Deliberately unauthenticated and deliberately narrow: the query behind it
 * selects PUBLIC_FIELDS only, so addresses, contact numbers and OTPs are not
 * reachable from here even by scraping.
 */
router.get('/', TripController.getOpenTrips);

// ── Static single-segment paths, before '/:id' ──────────────────────────────
router.get('/my', authenticateToken, requireRole('fleet_operator'), TripController.getMyTrips);

router.get(
  '/generate-reference',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.generateReference
);

router.get('/active', authenticateToken, requireRole('owner_driver'), TripController.getActiveTrips);

// ── Fleet operator ─────────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole('fleet_operator'), TripController.createTrip);

router.get(
  '/:id/applicants',
  authenticateToken,
  requireRole('fleet_operator'),
  ApplicationController.getTripApplicants
);

/**
 * WhatsApp deep links for the two OTPs. The only endpoint that hands the
 * operator ready-to-send share links, so the message text lives server-side
 * rather than being assembled in the browser.
 */
router.get(
  '/:id/otp-links',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.getOtpLinks
);

router.get(
  '/:id/timeline',
  authenticateToken,
  requireRole('fleet_operator', 'owner_driver'),
  TripController.getTimeline
);

router.post(
  '/:id/reassign',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.reassignTrip
);

router.put(
  '/:id/confirm-delivery',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.confirmDelivery
);

router.put(
  '/:id/payment',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.markPaymentPaid
);

router.get(
  '/:id/rating',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.getTripRating
);

router.post(
  '/:id/rating',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.rateTrip
);

router.put(
  '/:id/status',
  authenticateToken,
  requireRole('fleet_operator'),
  TripController.updateTripStatus
);

router.put('/:id', authenticateToken, requireRole('fleet_operator'), TripController.updateTrip);
router.delete('/:id', authenticateToken, requireRole('fleet_operator'), TripController.deleteTrip);

// ── Owner driver ───────────────────────────────────────────────────────────
router.put(
  '/:id/confirm',
  authenticateToken,
  requireRole('owner_driver'),
  TripController.confirmTrip
);

router.post(
  '/:id/updates',
  authenticateToken,
  requireRole('owner_driver'),
  TripController.addUpdate
);

router.post(
  '/:id/verify-pickup',
  authenticateToken,
  requireRole('owner_driver'),
  TripController.verifyPickup
);

/**
 * The only multipart endpoint. proofUpload must run before the controller so
 * req.body.otp and req.file are both populated; the controller removes the
 * file again if the OTP turns out to be wrong.
 */
router.post(
  '/:id/verify-delivery',
  authenticateToken,
  requireRole('owner_driver'),
  proofUpload,
  TripController.verifyDelivery
);

// ── Any authenticated reader, only once the static paths are done ─────────
/**
 * optionalAuth lets getTripById return the full row for the operator or the
 * confirmed driver, and a reduced row for anyone else — without splitting
 * this into two URLs.
 */
router.get('/:id', optionalAuth, TripController.getTripById);

module.exports = router;
