// Lifecycle rule checks for the trip state machine, OTPs and deadlines.
const L = require('../src/utils/tripLifecycle');

let fail = 0;
const t = (n, c) => { console.log((c ? 'OK  ' : 'FAIL') + '  ' + n); if (!c) fail++; };

console.log('timezone under test: UTC' + (-new Date().getTimezoneOffset() / 60) + ' (India is +5.5)');
console.log('');

console.log('-- status machine --');
t('open -> assigned', L.canTransition('open', 'assigned'));
t('open -> confirmed rejected', !L.canTransition('open', 'confirmed'));
t('assigned -> open (reassign)', L.canTransition('assigned', 'open'));
t('assigned -> confirmed', L.canTransition('assigned', 'confirmed'));
t('confirmed -> in_transit', L.canTransition('confirmed', 'in_transit'));
t('in_transit -> delivered', L.canTransition('in_transit', 'delivered'));
t('delivered -> completed', L.canTransition('delivered', 'completed'));
t('completed is terminal', !L.canTransition('completed', 'open'));
t('cancelled is terminal', !L.canTransition('cancelled', 'assigned'));
t('delivered -> in_transit rejected', !L.canTransition('delivered', 'in_transit'));

console.log('');
console.log('-- OTP pair --');
let bad = 0;
for (let i = 0; i < 50000; i++) {
  const p = L.generateOtpPair();
  if (!/^\d{4}$/.test(p.pickup_otp) || !/^\d{4}$/.test(p.delivery_otp) || p.pickup_otp === p.delivery_otp) bad++;
}
t('50k pairs: both exactly 4 digits and distinct (' + bad + ' bad)', bad === 0);

console.log('');
console.log('-- confirm window (the 2h deadline) --');
const fresh = L.confirmDeadline();
// Read back exactly the way MySQL + isConfirmExpired + the browser do: as a
// naive local-time string.
const roundTrip = new Date(fresh);
const hoursOut = (roundTrip - Date.now()) / 3600000;
t('stored literal is YYYY-MM-DD HH:MM:SS', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fresh));
t('round-trips as local time ~2h out (' + hoursOut.toFixed(3) + 'h)', hoursOut > 1.95 && hoursOut < 2.05);
t('not expired immediately', L.isConfirmExpired(fresh) === false);
// A deadline written 3h ago is 1h in the past.
const past = L.confirmDeadline(new Date(Date.now() - 3 * 60 * 60 * 1000));
t('expired once 1h past', L.isConfirmExpired(past) === true);
t('a minute inside the window is not expired', L.isConfirmExpired(L.confirmDeadline(new Date(Date.now() - 60 * 60 * 1000))) === false);
t('null deadline (legacy row) is not expired', L.isConfirmExpired(null) === false);

console.log('');
console.log('-- Indian phone --');
t('9876543210 valid', L.isIndianPhone('9876543210'));
t('6123456789 valid (starts 6)', L.isIndianPhone('6123456789'));
t('1234567890 invalid (leading 1)', !L.isIndianPhone('1234567890'));
t('98765 too short', !L.isIndianPhone('98765'));
t('98765432101 too long', !L.isIndianPhone('98765432101'));
t('not a string', !L.isIndianPhone(9876543210));

console.log('');
console.log('-- WhatsApp share links --');
t('valid number -> wa.me/91 link', L.whatsappOtpLink('9876543210', 'OTP 1234') === 'https://wa.me/919876543210?text=OTP%201234');
t('null number -> null', L.whatsappOtpLink(null, 'x') === null);
t('migration placeholder 0000000000 -> null', L.whatsappOtpLink('0000000000', 'x') === null);
t('non-Indian number -> null', L.whatsappOtpLink('1234567890', 'x') === null);

console.log('');
console.log(fail ? fail + ' FAILURE(S)' : 'All lifecycle rules pass.');
process.exitCode = fail ? 1 : 0;
