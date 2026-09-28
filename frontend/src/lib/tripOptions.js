// Indian market options for trips, shared by the operator and driver dashboards.
// These mirror the ENUMs and column sizes in the MySQL trips table — vehicle_type
// and cargo_type are VARCHAR(50), so each label below must stay under 50 chars.

export const VEHICLE_TYPES = [
  'Tata Ace / Chhota Hathi (mini truck)',
  'Pickup (Bolero / Mahindra)',
  'Eicher (14–19 ft)',
  '6-Wheeler Truck',
  '10-Wheeler Truck',
  '12/14-Wheeler Truck',
  'Trailer (Semi / Full)',
  'Container (20 ft / 32 ft)',
  'Tanker',
  'Refrigerated Truck'
];

export const CARGO_TYPES = [
  'General Goods',
  'FMCG',
  'Textiles',
  'Agricultural Produce',
  'Construction Material',
  'Machinery',
  'Chemicals',
  'Auto Parts',
  'Electronics',
  'Perishables'
];

/** Matches the trips.payment_method ENUM exactly — these values go to the API. */
export const PAYMENT_METHODS = [
  { value: 'online', label: 'Online' },
  { value: 'cash', label: 'Cash' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
];

export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((method) => method.value);

/** Badge colours per payment method, for the trip cards. */
export const PAYMENT_METHOD_STYLES = {
  online: 'bg-blue-100 text-blue-700 border-blue-200',
  cash: 'bg-green-100 text-green-700 border-green-200',
  net_banking: 'bg-purple-100 text-purple-700 border-purple-200',
  bank_transfer: 'bg-orange-100 text-orange-700 border-orange-200'
};

/** human label for a stored payment_method value, e.g. 'net_banking' → 'Net Banking' */
export function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label || value || '—';
}

/** Tailwind classes for a payment method badge, with a neutral fallback. */
export function paymentMethodStyle(value) {
  return PAYMENT_METHOD_STYLES[value] || 'bg-gray-100 text-gray-600 border-gray-200';
}
