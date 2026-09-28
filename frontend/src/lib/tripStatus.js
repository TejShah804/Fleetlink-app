/**
 * Driver-side lifecycle helpers shared by DriverDashboard and ActiveTrip.
 *
 * Everything here is display logic only — no formatting, no dates. Those live
 * in lib/format.js so there is a single implementation of each.
 */

/** Every value trips.status can hold, in lifecycle order. */
export const TRIP_STATUSES = [
  'open',
  'assigned',
  'confirmed',
  'in_transit',
  'delivered',
  'completed',
  'cancelled'
];

/** Statuses where a driver still has to act. */
export const ACTIVE_TRIP_STATUSES = ['assigned', 'confirmed', 'in_transit', 'delivered'];

/** Milestone types the driver can post through POST /trips/:id/updates. */
export const DRIVER_UPDATE_TYPES = {
  reached_pickup: 'Reached Pickup',
  checkpoint: 'Post Update',
  delay: 'Report Delay',
  reached_destination: 'Reached Destination'
};

/** Types the system writes on the driver's behalf. */
export const SYSTEM_UPDATE_TYPES = {
  loaded: 'Load Collected',
  delivered: 'Delivered'
};

/** Human label for a status, e.g. 'in_transit' → 'In transit'. */
export function statusLabel(status) {
  if (!status) return '—';
  const spaced = String(status).replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Label for a timeline entry, falling back to the raw value. */
export function updateTypeLabel(type) {
  return DRIVER_UPDATE_TYPES[type] || SYSTEM_UPDATE_TYPES[type] || statusLabel(type);
}

/** Tailwind classes for a status badge, matching the admin panel's palette. */
export function statusStyle(status) {
  // pending/accepted/rejected are application statuses, not trip statuses, but
  // the driver's application list renders them through the same badge
  const styles = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    assigned: 'bg-purple-100 text-purple-700 border-purple-200',
    confirmed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    in_transit: 'bg-orange-100 text-orange-700 border-orange-200',
    delivered: 'bg-teal-100 text-teal-700 border-teal-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    accepted: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
  };
  return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

/**
 * Which lifecycle actions are available for a trip the driver can see.
 * Kept as a single function so the Active Trip page and any badge agree.
 */
export function driverActions(status) {
  return {
    canConfirm: status === 'assigned',
    canLogMilestones: status === 'confirmed' || status === 'in_transit',
    canVerifyPickup: status === 'confirmed',
    canVerifyDelivery: status === 'in_transit'
  };
}

/**
 * Remaining whole minutes until the confirm deadline, floored at 0.
 * Accepts the 'YYYY-MM-DD HH:MM:SS' string the API returns, which is parsed
 * as local time on purpose — the deadline was generated from server local time.
 */
export function minutesRemaining(confirmBy, now = Date.now()) {
  if (!confirmBy) return 0;
  const deadline = new Date(String(confirmBy).replace(' ', 'T')).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, Math.floor((deadline - now) / 60000));
}

/** '1h 45m' / '45m' / 'expired' for the confirm countdown. */
export function countdownLabel(confirmBy, now = Date.now()) {
  const minutes = minutesRemaining(confirmBy, now);
  if (minutes <= 0) return 'expired';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/** True once the deadline has passed, which is when Reassign becomes legal. */
export function isConfirmExpired(confirmBy, now = Date.now()) {
  return minutesRemaining(confirmBy, now) <= 0;
}

/** A tel: link for the Call buttons. */
export function telLink(phone) {
  return `tel:${String(phone || '').replace(/\D/g, '')}`;
}
