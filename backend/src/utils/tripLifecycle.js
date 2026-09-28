const crypto = require('crypto');

/**
 * Trip lifecycle rules, shared by tripController and applicationController so
 * there is exactly one definition of what a legal transition is.
 */

/** Every value trips.status can hold. */
const TRIP_STATUSES = [
  'open',
  'assigned',
  'confirmed',
  'in_transit',
  'delivered',
  'completed',
  'cancelled'
];

/**
 * Allowed next statuses per current status.
 *
 * `cancelled` is reachable from any pre-transit state — an operator may pull
 * a trip out of the market at any point before the driver has actually loaded.
 * Once a load is physically in transit we do not allow cancel, since the goods
 * are already moving and the operator must resolve it with the driver.
 */
const ALLOWED_TRANSITIONS = {
  open: ['assigned', 'cancelled'],
  assigned: ['confirmed', 'open', 'cancelled'], // back to 'open' = reassign
  confirmed: ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: []
};

/** Statuses where a driver is still expected to act. */
const ACTIVE_DRIVER_STATUSES = ['assigned', 'confirmed', 'in_transit'];

/** Milestone types an assigned driver may log through POST /trips/:id/updates. */
const DRIVER_UPDATE_TYPES = ['reached_pickup', 'checkpoint', 'delay', 'reached_destination'];

/** Every timeline type, including the two the system writes automatically. */
const UPDATE_TYPES = [
  'reached_pickup',
  'loaded',
  'checkpoint',
  'delay',
  'reached_destination',
  'delivered'
];

/** Wrong-OTP attempts tolerated before the trip is locked and the operator told. */
const MAX_OTP_ATTEMPTS = 5;

/** How long an assigned driver has to confirm after approval. */
const CONFIRM_WINDOW_HOURS = 2;

/** Silence after which an in-transit trip is flagged to the operator. */
const NO_UPDATE_ALERT_HOURS = 6;

/**
 * A 4-digit OTP.
 *
 * crypto.randomInt(1000, 10000) is used rather than Math.random so the codes
 * are not predictable from observed values. The upper bound is exclusive, so
 * 10000 is never returned and the result is always exactly 4 digits.
 */
function generateOtp() {
  return String(crypto.randomInt(1000, 10000));
}

/** Two distinct 4-digit OTPs; the retry keeps them unique for the same trip. */
function generateOtpPair() {
  const pickup = generateOtp();
  let delivery = generateOtp();
  while (delivery === pickup) {
    delivery = generateOtp();
  }
  return { pickup_otp: pickup, delivery_otp: delivery };
}

/**
 * now + CONFIRM_WINDOW_HOURS, as a MySQL DATETIME literal.
 *
 * Deliberately formatted in the SERVER'S LOCAL time, not UTC. The value is
 * written into a DATETIME column (no timezone) and is then read back and
 * parsed as local time by isConfirmExpired here and by the browser's countdown.
 * Using toISOString() would store a UTC wall-clock while everything else treats
 * the string as local — and in a timezone ahead of UTC (India is +05:30) that
 * puts the deadline in the past the moment it is written, so every driver
 * would appear expired immediately and Reassign would be legal from the start.
 */
function confirmDeadline(from = new Date()) {
  const deadline = new Date(from.getTime() + CONFIRM_WINDOW_HOURS * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())} ` +
    `${pad(deadline.getHours())}:${pad(deadline.getMinutes())}:${pad(deadline.getSeconds())}`
  );
}

/**
 * Is a transition from -> to allowed?
 */
function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/** Human sentence used in 400 responses, e.g. 'Trip is assigned and can move to: confirmed, open, cancelled.' */
function transitionHint(from) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (allowed.length === 0) {
    return `Trip is already ${from.replace(/_/g, ' ')} and cannot change status.`;
  }
  return `Trip is ${from.replace(/_/g, ' ')} and can move to: ${allowed.join(', ')}.`;
}

/**
 * Has the confirm deadline passed?
 * A null deadline (legacy rows) counts as not expired.
 */
function isConfirmExpired(confirm_by, now = new Date()) {
  if (!confirm_by) return false;
  // MySQL DATETIME is returned as a JS Date in the server's local time by
  // mysql2, so a plain Date comparison is correct here.
  const deadline = confirm_by instanceof Date ? confirm_by : new Date(confirm_by);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() > deadline.getTime();
}

/** A 10-digit Indian mobile number: starts 6-9, then 9 more digits. */
function isIndianPhone(value) {
  return typeof value === 'string' && /^[6-9]\d{9}$/.test(value.trim());
}

/**
 * WhatsApp deep link with a prefilled message, for sharing an OTP.
 *
 * Returns null when the number is not a usable Indian mobile, so the caller
 * can hide the share button instead of rendering a wa.me link that opens an
 * error page. That matters for rows backfilled by the migration, which carry
 * the placeholder 0000000000 — a 10-digit string that would otherwise produce
 * a syntactically valid but unreachable wa.me/919000000000 link.
 */
function whatsappOtpLink(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!isIndianPhone(digits)) return null;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  TRIP_STATUSES,
  ALLOWED_TRANSITIONS,
  ACTIVE_DRIVER_STATUSES,
  DRIVER_UPDATE_TYPES,
  UPDATE_TYPES,
  MAX_OTP_ATTEMPTS,
  CONFIRM_WINDOW_HOURS,
  NO_UPDATE_ALERT_HOURS,
  generateOtp,
  generateOtpPair,
  confirmDeadline,
  canTransition,
  transitionHint,
  isConfirmExpired,
  isIndianPhone,
  whatsappOtpLink
};
