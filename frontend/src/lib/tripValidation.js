/**
 * Client-side validation for the operator's Post / Edit Trip form.
 *
 * The server is the authority — TripController.validateTrip() rejects anything
 * invalid. This exists only to show the operator every problem at once, in the
 * form's own language, instead of discovering them one 400 at a time.
 *
 * It runs against a form with noValidate on purpose. Native browser messages
 * were firing against fields scrolled out of sight in a modal this long, which
 * reads to the operator as "the Post Trip button does nothing".
 *
 * Kept pure and free of JSX so it can be exercised directly by node.
 */

import { todayISODate } from './format.js';

/** A 10-digit Indian mobile: starts 6-9. Mirrors isIndianPhone on the server. */
export const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

export { todayISODate };

const PHONE_MESSAGE = 'Enter a valid 10-digit Indian mobile number (starts 6-9).';

/**
 * @param {object} form   the current form state
 * @param {string} today  YYYY-MM-DD, injectable so the check is testable
 * @returns {object}      field name → message, empty when the form is valid
 */
export function validateTripForm(form, today = todayISODate()) {
  const errors = {};
  const text = (v) => String(v || '').trim();

  if (!text(form.load_reference)) errors.load_reference = 'Load reference is required.';

  if (!text(form.source)) {
    errors.source = 'From (source) is required.';
  }
  if (!text(form.destination)) {
    errors.destination = 'To (destination) is required.';
  } else if (text(form.source) && text(form.source).toLowerCase() === text(form.destination).toLowerCase()) {
    errors.destination = 'Source and destination must be different.';
  }

  if (!text(form.vehicle_type)) errors.vehicle_type = 'Vehicle type is required.';

  if (!String(form.price ?? '').trim()) {
    errors.price = 'Price is required.';
  } else {
    const price = Number(form.price);
    if (Number.isNaN(price)) errors.price = 'Price must be a number.';
    else if (price <= 0) errors.price = 'Price must be greater than 0.';
  }

  if (String(form.weight_tonnes ?? '').trim() !== '') {
    const weight = Number(form.weight_tonnes);
    if (Number.isNaN(weight)) errors.weight_tonnes = 'Weight must be a number.';
    else if (weight <= 0) errors.weight_tonnes = 'Weight must be greater than 0 tonnes.';
  }

  if (!text(form.pickup_date)) {
    errors.pickup_date = 'Pickup date is required.';
  } else if (form.pickup_date < today) {
    errors.pickup_date = 'Pickup date cannot be in the past.';
  }

  if (!text(form.pickup_time)) errors.pickup_time = 'Pickup time is required.';

  if (!text(form.delivery_date)) {
    errors.delivery_date = 'Delivery date is required.';
  } else if (text(form.pickup_date) && form.delivery_date < form.pickup_date) {
    errors.delivery_date = 'Delivery date must be on or after the pickup date.';
  }

  if (!text(form.payment_method)) errors.payment_method = 'Payment method is required.';

  if (!text(form.pickup_address)) errors.pickup_address = 'Pickup address is required.';
  if (!text(form.pickup_contact_name)) errors.pickup_contact_name = 'Pickup contact name is required.';
  if (!text(form.pickup_contact_phone)) {
    errors.pickup_contact_phone = 'Pickup contact phone is required.';
  } else if (!INDIAN_PHONE_RE.test(text(form.pickup_contact_phone))) {
    errors.pickup_contact_phone = PHONE_MESSAGE;
  }

  if (!text(form.receiver_name)) errors.receiver_name = 'Receiver name is required.';
  if (!text(form.receiver_phone)) {
    errors.receiver_phone = 'Receiver phone is required.';
  } else if (!INDIAN_PHONE_RE.test(text(form.receiver_phone))) {
    errors.receiver_phone = PHONE_MESSAGE;
  }

  // delivery_address is optional — the driver is told to call the receiver
  return errors;
}
