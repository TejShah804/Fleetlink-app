// Formatting helpers for the admin panel.
// Kept out of shared.jsx so that file only exports React components
// (required by the react-refresh/only-export-components lint rule).
//
// Currency is delegated to the app-wide formatINR so there is a single
// implementation of Indian number formatting.

import { formatINR } from '@/lib/format';

export function formatCurrency(value) {
  return formatINR(value);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
