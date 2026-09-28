/**
 * The client form validator and the server's validateTrip() must agree.
 *
 * This walks the server's source and asserts that every field it can reject
 * has a matching check in the client validator, and that the phone regexes are
 * equivalent. A field added to one side only is a bug either way: silently
 * rejected on save, or rejected with a message the form never shows.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { validateTripForm, INDIAN_PHONE_RE } from '../src/lib/tripValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const serverSrc = readFileSync(
  path.join(root, 'backend', 'src', 'controllers', 'tripController.js'),
  'utf8'
);

let fail = 0;
const t = (name, cond, extra = '') => {
  console.log((cond ? 'OK  ' : 'FAIL') + '  ' + name + (cond ? '' : '  ' + extra));
  if (!cond) fail++;
};

// ── Isolate the server validator ────────────────────────────────────────────
const start = serverSrc.indexOf('function validateTrip(');
const end = serverSrc.indexOf('\nfunction ', start + 1);
const validator = serverSrc.slice(start, end === -1 ? undefined : end);

// Every `errors.<field> =` in the server validator
const serverFields = [...new Set([...validator.matchAll(/errors\.([a-z_]+)\s*=/g)].map((m) => m[1]))];

// Which of those the client also reports. The probe value has to reach the
// check: empty is the "field was not provided" path for the optional fields,
// so weight_tonnes is probed with 0, which both sides reject.
const probeFor = (field) => {
  const form = {
    load_reference: '',
    source: '',
    destination: '',
    vehicle_type: '',
    price: '',
    weight_tonnes: '0',
    pickup_date: '',
    pickup_time: '',
    delivery_date: '',
    payment_method: '',
    pickup_address: '',
    pickup_contact_name: '',
    pickup_contact_phone: '1',
    receiver_name: '',
    receiver_phone: '1'
  };
  if (field === 'delivery_date') form.pickup_date = '2026-09-30';
  return form;
};

const clientReportable = new Set();
for (const field of serverFields) {
  if (validateTripForm(probeFor(field), '2026-09-28')[field]) clientReportable.add(field);
}

console.log('-- field coverage --');
t(
  'the server validator was found',
  start !== -1,
  'validateTrip( not present in tripController.js'
);
console.log('   server can reject: ' + serverFields.length + ' fields');
console.log('   client reports   : ' + clientReportable.size + ' fields');

const missing = serverFields.filter((f) => !clientReportable.has(f));
t(
  'every server-rejectable field is also reported client-side',
  missing.length === 0,
  'missing: ' + missing.join(', ')
);

// ── Cross-field checks must exist on both sides ────────────────────────────
console.log('');
console.log('-- cross-field rules --');
const base = {
  load_reference: 'R', source: 'A', destination: 'B', vehicle_type: 'V',
  price: '100', pickup_date: '2026-09-30', pickup_time: '09:00',
  delivery_date: '2026-10-01', payment_method: 'cash',
  pickup_address: 'x', pickup_contact_name: 'n',
  pickup_contact_phone: '9876543210', receiver_name: 'r', receiver_phone: '9876543210'
};
t('server has a source === destination check', /toLowerCase\(\) === destination\.toLowerCase\(\)/.test(validator));
t('client agrees', /different/.test(validateTripForm({ ...base, destination: 'a' }, '2026-09-28').destination || ''));
t('server has a delivery < pickup check', /delivery_date < data\.pickup_date/.test(validator));
t('client agrees', Boolean(validateTripForm({ ...base, delivery_date: '2026-09-01' }, '2026-09-28').delivery_date));
t('server has a past-pickup check', /pickup_date < todayISODate\(\)/.test(validator));
t('client agrees', Boolean(validateTripForm({ ...base, pickup_date: '2026-01-01' }, '2026-09-28').pickup_date));
t('server treats delivery_address as optional', !/errors\.delivery_address\s*=/.test(validator));
t('client treats delivery_address as optional', !validateTripForm({ ...base, delivery_address: '' }, '2026-09-28').delivery_address);

// ── Phone regexes must be the same rule ────────────────────────────────────
console.log('');
console.log('-- phone rule parity --');
// isIndianPhone lives in utils/tripLifecycle.js, not the controller
const lifecycleSrc = readFileSync(
  path.join(root, 'backend', 'src', 'utils', 'tripLifecycle.js'),
  'utf8'
);
const serverPhone = /function isIndianPhone[\s\S]*?return ([^;]+);/.exec(lifecycleSrc);
t('server isIndianPhone exists in utils/tripLifecycle.js', Boolean(serverPhone));
if (serverPhone) {
  const src = serverPhone[1].trim();
  const clientSrc = String(INDIAN_PHONE_RE);
  t('client is [6-9] then 9 digits', /\[6-9\]/.test(clientSrc) && /\\d\{9\}/.test(clientSrc), 'client: ' + clientSrc);
  t('server is [6-9] then 9 digits', /6-9/.test(src) && /\\d\{9\}/.test(src), 'server: ' + src);
}

console.log('');
console.log(fail ? fail + ' FAILURE(S) — the two validators have drifted' : 'Client and server validation agree.');
process.exitCode = fail ? 1 : 0;
