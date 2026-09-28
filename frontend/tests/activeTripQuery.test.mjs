/**
 * Guards the driver's active-trips query against the two ways it can quietly
 * break the Active Trip page:
 *
 *   1. a field ActiveTrip.jsx reads is no longer selected — the UI reads
 *      undefined and degrades silently (this is what happened to
 *      otp_attempts, which made the 5-attempt OTP lock never appear);
 *   2. a sensitive column is selected without the 'assigned' CASE gate, which
 *      would leak the pickup address and contact numbers to a driver who has
 *      not confirmed the trip yet.
 *
 * The query is inspected as text, so this needs no database.
 * Run: node tests/activeTripQuery.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const modelSrc = readFileSync(path.join(root, 'backend', 'src', 'models', 'tripModel.js'), 'utf8');
const activeTripSrc = readFileSync(
  path.join(root, 'frontend', 'src', 'components', 'ActiveTrip.jsx'),
  'utf8'
);

// ── Pull out just the getActiveTripsForDriver query ─────────────────────────
const fnStart = modelSrc.indexOf('static async getActiveTripsForDriver(');
if (fnStart === -1) throw new Error('getActiveTripsForDriver not found in tripModel.js');
const fnEnd = modelSrc.indexOf('\n  static ', fnStart + 1);
const query = modelSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

let fail = 0;
const t = (name, cond, extra = '') => {
  console.log((cond ? 'OK  ' : 'FAIL') + '  ' + name + (cond ? '' : '\n        ' + extra));
  if (!cond) fail++;
};

console.log('-- every field the driver UI reads must be selected --');
const uiFields = [...new Set([...activeTripSrc.matchAll(/trip\.([a-z_]+)/g)].map((m) => m[1]))]
  .filter((f) => f !== 'id')
  .sort();

console.log('   ActiveTrip.jsx reads ' + uiFields.length + ' fields off a trip:');
console.log('   ' + uiFields.join(', '));

const selected = new Set(
  [...query.matchAll(/t\.([a-z_]+)/g)].map((m) => m[1]).concat(
    [...query.matchAll(/AS ([a-z_]+)/g)].map((m) => m[1])
  )
);

const notSelected = uiFields.filter((f) => !selected.has(f));
t(
  'ActiveTrip.jsx reads no field the query fails to return',
  notSelected.length === 0,
  'missing from the query: ' + notSelected.join(', ')
);

console.log('');
console.log('-- the OTP lock needs its attempt counter --');
t('otp_attempts is selected', selected.has('otp_attempts'));
t('ActiveTrip.jsx still compares otp_attempts against 5', /otp_attempts\s*>=\s*5/.test(activeTripSrc));

console.log('');
console.log('-- sensitive columns must stay gated until confirmation --');
const SENSITIVE = [
  'pickup_address',
  'pickup_contact_name',
  'pickup_contact_phone',
  'delivery_address',
  'receiver_name',
  'receiver_phone'
];
for (const col of SENSITIVE) {
  // A gated column looks like: CASE WHEN t.status = 'assigned' THEN NULL ELSE t.<col> END
  const gated = new RegExp(
    `CASE WHEN t\\.status = 'assigned' THEN NULL ELSE t\\.${col} END AS ${col}`
  ).test(query);
  const bare = new RegExp(`^\\s*t\\.${col},`, 'm').test(query);
  t(
    `${col} is CASE-gated, not selected bare`,
    gated && !bare,
    gated ? 'also selected bare somewhere' : 'no CASE gate found'
  );
}

console.log('');
console.log('-- OTPs are never handed to the driver --');
t('pickup_otp is not selected', !selected.has('pickup_otp'));
t('delivery_otp is not selected', !selected.has('delivery_otp'));
// The query documents the omission in a comment naming both columns, so the
// text has to be stripped of SQL comments before looking for them.
const queryCode = query.replace(/--[^\n]*/g, '');
t('neither OTP appears in the executable query', !/pickup_otp|delivery_otp/.test(queryCode));

console.log('');
console.log('-- the statuses the driver can act on --');
const statuses = /AND t\.status IN \(([^)]+)\)/.exec(query);
t('the actionable status list is present', Boolean(statuses));
if (statuses) {
  console.log('   ' + statuses[1].replace(/'/g, '').replace(/\s+/g, ' ').trim());
  for (const s of ['assigned', 'confirmed', 'in_transit', 'delivered']) {
    t(`'${s}' is included`, statuses[1].includes(`'${s}'`));
  }
  t('completed and cancelled are excluded', !/completed|cancelled/.test(statuses[1]));
}

console.log('');
console.log(fail ? fail + ' FAILURE(S)' : 'Active-trips query is consistent with the driver UI.');
process.exitCode = fail ? 1 : 0;
