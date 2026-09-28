// Shared formatting helpers for the whole FleetLink app.
// One currency formatter and one trip-date formatter, used by the operator
// dashboard, the driver dashboard and the admin panel.

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Indian Rupee amount in the Indian digit grouping, e.g. ₹25,000 or ₹1,50,000.
 * Accepts anything numeric-ish; a MySQL DECIMAL may arrive as a string.
 */
export function formatINR(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Trip date as DD MMM YYYY, e.g. "05 Oct 2026".
 *
 * The API returns bare YYYY-MM-DD strings, and `new Date('2026-10-05')` is
 * parsed as UTC midnight — which renders as the previous day in any timezone
 * west of UTC. Those strings are therefore read field by field instead.
 */
export function formatTripDate(value) {
  if (!value) return '—';

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (iso) {
    const [, year, month, day] = iso;
    return `${day} ${MONTHS[Number(month) - 1] || month} ${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Trip time as a 12-hour clock, e.g. "9:00 AM" from "09:00". */
export function formatTripTime(value) {
  if (!value) return '—';

  const match = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!match) return String(value);

  const rawHour = Number(match[1]);
  if (rawHour > 23) return String(value);

  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;
  return `${hour}:${match[2]} ${suffix}`;
}

/**
 * A timestamp as "DD MMM YYYY, h:mm AM", e.g. "05 Oct 2026, 3:20 PM".
 *
 * MySQL DATETIME columns arrive as 'YYYY-MM-DD HH:MM:SS' with no timezone, and
 * they were written in the server's local time. The string is therefore read
 * field by field rather than through `new Date()`, which would apply a UTC
 * offset and could show the wrong day.
 */
export function formatDateTime(value) {
  if (!value) return '—';

  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(String(value));
  if (match) {
    const [, year, month, day, rawHour, minute] = match;
    return `${day} ${MONTHS[Number(month) - 1] || month} ${year}, ${formatTripTime(`${rawHour}:${minute}`)}`;
  }

  // Already an ISO string with a timezone: the browser can localise it itself.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatTripDate(value)}, ${date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;
}

// Optional chaining keeps this module importable from plain node, which the
// tests under tests/ rely on: outside Vite, import.meta.env does not exist.
// In the app it is an object and behaves exactly as before.
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Turn a server-relative asset path into a URL the browser can load.
 *
 * Uploaded files are stored and returned as '/uploads/proofs/...', but there
 * is no dev proxy in front of the API — a bare path would resolve against the
 * frontend origin (localhost:5173) and 404. The API base is where those files
 * actually live, so '/api' is trimmed off to get the server origin.
 *
 * Absolute URLs are passed through untouched, so this is safe to apply to any
 * path the API returns.
 */
export function apiAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Today in the browser's own timezone, as YYYY-MM-DD, for date input `min`. */
export function todayISODate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A YYYY-MM-DD string `days` after the given date, for chained date input `min`. */
export function addDaysISO(isoDate, days) {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate));
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setDate(date.getDate() + days);

  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}
