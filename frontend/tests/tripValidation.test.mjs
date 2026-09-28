// Checks for lib/tripValidation.js. Run with: node --experimental-strip-types
// or directly under Node 22+ ESM, since the module is plain ESM with no JSX.
import { validateTripForm, INDIAN_PHONE_RE } from '../src/lib/tripValidation.js';

let fail = 0;
const t = (name, cond) => {
  console.log((cond ? 'OK  ' : 'FAIL') + '  ' + name);
  if (!cond) fail++;
};

const TODAY = '2026-09-28';

// A form an operator would consider completely filled in.
const valid = {
  load_reference: 'FL-TRP-1234',
  source: 'Ahmedabad',
  destination: 'Vadodara',
  vehicle_type: 'Container Truck 20ft',
  cargo_type: 'General Goods',
  weight_tonnes: '9.5',
  price: '25000',
  pickup_date: '2026-09-30',
  pickup_time: '09:00',
  delivery_date: '2026-10-01',
  payment_method: 'cash',
  notes: '',
  pickup_address: 'Warehouse 14, SG Highway, Ahmedabad 380054',
  pickup_contact_name: 'Ramesh Patel',
  pickup_contact_phone: '9876543210',
  delivery_address: '',            // optional on purpose
  receiver_name: 'Sunita Desai',
  receiver_phone: '9823456789'
};

console.log('-- the fully filled form must pass --');
const ok = validateTripForm(valid, TODAY);
t('a completely filled form has no errors', Object.keys(ok).length === 0);
if (Object.keys(ok).length) console.log('       unexpected: ' + JSON.stringify(ok, null, 2));

console.log('');
console.log('-- each required field is caught when empty --');
for (const field of [
  'load_reference', 'source', 'destination', 'vehicle_type', 'price',
  'pickup_date', 'pickup_time', 'delivery_date', 'payment_method',
  'pickup_address', 'pickup_contact_name', 'pickup_contact_phone',
  'receiver_name', 'receiver_phone'
]) {
  const errors = validateTripForm({ ...valid, [field]: '' }, TODAY);
  t('empty ' + field + ' is reported', Boolean(errors[field]));
}

console.log('');
console.log('-- delivery_address really is optional --');
t('blank delivery_address is not an error', !validateTripForm(valid, TODAY).delivery_address);

console.log('');
console.log('-- the cases that silently blocked submit before --');
const past = validateTripForm({ ...valid, pickup_date: '2026-09-01' }, TODAY);
t('pickup date in the past is reported', /past/.test(past.pickup_date || ''));
const back = validateTripForm({ ...valid, pickup_date: '2026-10-05', delivery_date: '2026-10-01' }, TODAY);
t('delivery before pickup is reported', /on or after/.test(back.delivery_date || ''));
t('zero price is reported', Boolean(validateTripForm({ ...valid, price: '0' }, TODAY).price));
t('negative price is reported', Boolean(validateTripForm({ ...valid, price: '-5' }, TODAY).price));
t('non-numeric price is reported', Boolean(validateTripForm({ ...valid, price: 'abc' }, TODAY).price));
t('zero weight is reported', Boolean(validateTripForm({ ...valid, weight_tonnes: '0' }, TODAY).weight_tonnes));
t('negative weight is reported', Boolean(validateTripForm({ ...valid, weight_tonnes: '-2' }, TODAY).weight_tonnes));

console.log('');
console.log('-- phone rules --');
for (const [n, okPhone] of [
  ['9876543210', true], ['6123456789', true], ['9999999999', true],
  ['1234567890', false], ['5876543210', false], ['98765', false],
  ['98765432101', false], ['98765abc10', false], ['', false]
]) {
  t(`${JSON.stringify(n)} ${okPhone ? 'accepted' : 'rejected'}`, INDIAN_PHONE_RE.test(n) === okPhone);
}
t('short pickup phone is reported',
  /10-digit/.test(validateTripForm({ ...valid, pickup_contact_phone: '98765' }, TODAY).pickup_contact_phone || ''));
t('short receiver phone is reported',
  /10-digit/.test(validateTripForm({ ...valid, receiver_phone: '1234567890' }, TODAY).receiver_phone || ''));

console.log('');
console.log('-- other rules --');
const same = validateTripForm({ ...valid, destination: 'ahmedabad' }, TODAY);
t('source == destination (any case) is reported', /different/.test(same.destination || ''));
t('whitespace-only text counts as empty',
  Boolean(validateTripForm({ ...valid, source: '   ' }, TODAY).source));
t('whitespace is trimmed before comparing phones',
  !validateTripForm({ ...valid, receiver_phone: '  9823456789  ' }, TODAY).receiver_phone);

console.log('');
console.log('-- every problem is reported at once, not one at a time --');
const all = validateTripForm({ ...valid, source: '', price: '', pickup_contact_phone: '1', receiver_name: '' }, TODAY);
t('4 separate problems all reported together', Object.keys(all).length === 4);

console.log('');
console.log(fail ? fail + ' FAILURE(S)' : 'All validation checks pass.');
process.exitCode = fail ? 1 : 0;
