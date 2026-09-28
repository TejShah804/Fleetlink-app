import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Truck, MapPin, Plus, X, Loader2, CheckCircle,
  AlertCircle, Users, LayoutDashboard, LogOut, RefreshCw,
  ChevronRight, Briefcase, Clock, XCircle, Edit2, Trash2, ChevronDown, ChevronUp,
  IndianRupee, CalendarDays, CreditCard, StickyNote, Lock,
  KeyRound, MessageCircle, Star, Camera, AlertTriangle
} from 'lucide-react';
import {
  VEHICLE_TYPES,
  CARGO_TYPES,
  PAYMENT_METHODS,
  paymentMethodLabel,
  paymentMethodStyle
} from '@/lib/tripOptions';
import { statusLabel, statusStyle, isConfirmExpired } from '@/lib/tripStatus';
import { validateTripForm, INDIAN_PHONE_RE as PHONE_RE } from '@/lib/tripValidation';
import { formatINR, formatTripDate, formatTripTime, todayISODate, apiAssetUrl } from '@/lib/format';

// ─── Status Badge ──────────────────────────────────────────────────────────────
// Styles and labels come from lib/tripStatus so the operator card, the driver
// card and the Active Trip page cannot disagree about a status.
function StatusBadge({ status }) {
  const icons = {
    open:          <Truck size={11} />,
    assigned:      <CheckCircle size={11} />,
    confirmed:     <CheckCircle size={11} />,
    in_transit:    <Truck size={11} />,
    delivered:     <MapPin size={11} />,
    completed:     <CheckCircle size={11} />,
    cancelled:     <XCircle size={11} />,
    pending:       <Clock size={11} />,
    accepted:      <CheckCircle size={11} />,
    rejected:      <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle(status)}`}>
      {icons[status] || null}
      {statusLabel(status).toUpperCase()}
    </span>
  );
}

export { VEHICLE_TYPES, CARGO_TYPES };

const EMPTY_FORM = {
  load_reference: '',
  source: '',
  destination: '',
  vehicle_type: VEHICLE_TYPES[0],
  cargo_type: 'General Goods',
  weight_tonnes: '',
  price: '',
  pickup_date: '',
  pickup_time: '09:00',
  delivery_date: '',
  payment_method: 'cash',
  notes: '',
  pickup_address: '',
  pickup_contact_name: '',
  pickup_contact_phone: '',
  delivery_address: '',
  receiver_name: '',
  receiver_phone: ''
};

/** 10-digit Indian mobile: starts 6-9. Mirrors isIndianPhone on the server. */
const INDIAN_PHONE_RE = PHONE_RE;

/** Inline message under a field, or nothing when the field is fine. */
function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
      <AlertCircle size={11} className="shrink-0" />
      {children}
    </p>
  );
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none';
const errorInputClass = 'border-red-300 focus:ring-red-400 focus:border-red-400 bg-red-50/40';

// ─── Post Trip Modal ───────────────────────────────────────────────────────────
function PostTripModal({ isOpen, onClose, onSuccess, authFetch, editTrip }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Fetch a reference that the database has not already used
  const refreshReference = useCallback(async () => {
    setRefLoading(true);
    setFieldErrors((prev) => ({ ...prev, load_reference: '' }));
    try {
      const res = await authFetch('/trips/generate-reference');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not generate a reference.');
      setForm((f) => ({ ...f, load_reference: data.load_reference }));
    } catch {
      // Fall back to a local code so the operator is never stuck
      setForm((f) => ({ ...f, load_reference: `FL-TRP-${Math.floor(1000 + Math.random() * 9000)}` }));
    } finally {
      setRefLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setFieldErrors({});

    if (editTrip) {
      setForm({
        load_reference: editTrip.load_reference || '',
        source: editTrip.source || '',
        destination: editTrip.destination || '',
        vehicle_type: editTrip.vehicle_type || VEHICLE_TYPES[0],
        cargo_type: editTrip.cargo_type || 'General Goods',
        weight_tonnes: editTrip.weight_tonnes ?? '',
        price: editTrip.price ?? '',
        pickup_date: editTrip.pickup_date || '',
        pickup_time: editTrip.pickup_time || '09:00',
        delivery_date: editTrip.delivery_date || '',
        payment_method: editTrip.payment_method || 'cash',
        notes: editTrip.notes || '',
        pickup_address: editTrip.pickup_address || '',
        pickup_contact_name: editTrip.pickup_contact_name || '',
        pickup_contact_phone: editTrip.pickup_contact_phone || '',
        delivery_address: editTrip.delivery_address || '',
        receiver_name: editTrip.receiver_name || '',
        receiver_phone: editTrip.receiver_phone || ''
      });
    } else {
      setForm({ ...EMPTY_FORM });
      refreshReference();
    }
  }, [editTrip, isOpen, refreshReference]);

  if (!isOpen) return null;

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Phone inputs: digits only, capped at 10, so the field can never hold junk. */
  const setPhoneField = (key) => (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setField(key)({ target: { value: digits } });
  };

  // Delivery can never precede pickup, so its floor follows the pickup date
  const deliveryMin = form.pickup_date || todayISODate();

  /** Put the first invalid field on screen so the error is never off-view. */
  const focusFirstError = (errors) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const el = document.getElementById(first);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mirrors the server's validateTrip so the operator sees every problem at
    // once instead of one 400 at a time. See lib/tripValidation.js.
    const problems = validateTripForm(form);
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      setError('Please correct the highlighted fields.');
      focusFirstError(problems);
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const payload = {
        load_reference: form.load_reference.trim(),
        source: form.source.trim(),
        destination: form.destination.trim(),
        vehicle_type: form.vehicle_type,
        cargo_type: form.cargo_type || 'General Goods',
        weight_tonnes: form.weight_tonnes ? parseFloat(form.weight_tonnes) : null,
        price: parseFloat(form.price),
        pickup_date: form.pickup_date,
        pickup_time: form.pickup_time,
        delivery_date: form.delivery_date,
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
        pickup_address: form.pickup_address.trim(),
        pickup_contact_name: form.pickup_contact_name.trim(),
        pickup_contact_phone: form.pickup_contact_phone.trim(),
        delivery_address: form.delivery_address.trim() || null,
        receiver_name: form.receiver_name.trim(),
        receiver_phone: form.receiver_phone.trim()
      };

      const res = editTrip
        ? await authFetch(`/trips/${editTrip.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await authFetch('/trips', { method: 'POST', body: JSON.stringify(payload) });

      const data = await res.json();

      if (!res.ok) {
        // Field-level problems render under their own input; anything else is a banner
        if (data.errors && Object.keys(data.errors).length > 0) {
          setFieldErrors(data.errors);
          setError(data.message || 'Please correct the highlighted fields.');
        } else {
          throw new Error(data.message || 'Failed to save trip.');
        }
        return;
      }

      onSuccess(editTrip ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save trip.');
    } finally {
      setLoading(false);
    }
  };

  // Trips posted before the Indian option list existed still hold their old
  // value — surface it so editing does not silently blank the dropdown
  const vehicleOptions =
    form.vehicle_type && !VEHICLE_TYPES.includes(form.vehicle_type)
      ? [...VEHICLE_TYPES, form.vehicle_type]
      : VEHICLE_TYPES;
  const cargoOptions =
    form.cargo_type && !CARGO_TYPES.includes(form.cargo_type)
      ? [...CARGO_TYPES, form.cargo_type]
      : CARGO_TYPES;

  return (
    // items-start + a bounded card: with ~19 fields the content is taller than
    // any laptop screen, and a plain items-center flex container centres the
    // overflow so the top of the form becomes unreachable by scrolling.
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stays put while the body scrolls, so the close button and
            title are never the part that scrolls out of view. */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-brand-navy mb-1 flex items-center gap-2">
            <Briefcase size={20} className="text-brand-orange" />
            {editTrip ? 'Edit Trip' : 'Post a New Trip'}
          </h2>
          <p className="text-xs text-gray-500">
            All amounts are in Indian Rupees (₹ INR).
          </p>
        </div>

        {/* Scrollable body — min-h-0 is what lets a flex child actually shrink
            and scroll instead of forcing the card to grow. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="post-trip-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Load Reference # (Unique) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="load_reference" className="block text-sm font-bold text-brand-navy">
                Load Reference # <span className="text-brand-orange">*</span>
              </label>
              <span className="text-[11px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-semibold">
                Unique Trip ID
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id="load_reference"
                required
                value={form.load_reference}
                onChange={setField('load_reference')}
                placeholder="e.g. FL-TRP-3920"
                className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm font-mono uppercase focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none ${fieldErrors.load_reference ? errorInputClass : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={refreshReference}
                disabled={refLoading}
                className="absolute right-2 p-1.5 text-gray-400 hover:text-brand-orange transition-colors disabled:opacity-50"
                title="Generate a new unique reference code"
              >
                <RefreshCw size={15} className={refLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <FieldError>{fieldErrors.load_reference}</FieldError>
            <p className="text-[11px] text-gray-400 mt-1">
              Unique tracking identifier for this load. Auto-generated or enter your own reference.
            </p>
          </div>

          {/* Route (From & To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="source" className="block text-sm font-bold text-brand-navy mb-1">
                From (Source) <span className="text-brand-orange">*</span>
              </label>
              <input
                id="source"
                required
                value={form.source}
                onChange={setField('source')}
                placeholder="e.g. Ahmedabad, Gujarat"
                className={`${inputClass} ${fieldErrors.source ? errorInputClass : ''}`}
              />
              <FieldError>{fieldErrors.source}</FieldError>
            </div>
            <div>
              <label htmlFor="destination" className="block text-sm font-bold text-brand-navy mb-1">
                To (Destination) <span className="text-brand-orange">*</span>
              </label>
              <input
                id="destination"
                required
                value={form.destination}
                onChange={setField('destination')}
                placeholder="e.g. Mumbai, Maharashtra"
                className={`${inputClass} ${fieldErrors.destination ? errorInputClass : ''}`}
              />
              <FieldError>{fieldErrors.destination}</FieldError>
            </div>
          </div>

          {/* Vehicle Type Dropdown & Cargo Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vehicle_type" className="block text-sm font-bold text-brand-navy mb-1">
                Vehicle Type <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <select
                  id="vehicle_type"
                  required
                  value={form.vehicle_type}
                  onChange={setField('vehicle_type')}
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer ${fieldErrors.vehicle_type ? errorInputClass : 'border-gray-300'}`}
                >
                  <option value="" disabled>Select vehicle type</option>
                  {vehicleOptions.map((vt) => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                  <ChevronDown size={15} />
                </div>
              </div>
              <FieldError>{fieldErrors.vehicle_type}</FieldError>
            </div>

            <div>
              <label htmlFor="cargo_type" className="block text-sm font-bold text-brand-navy mb-1">
                Cargo / Goods Type
              </label>
              <div className="relative">
                <select
                  id="cargo_type"
                  value={form.cargo_type}
                  onChange={setField('cargo_type')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer"
                >
                  {cargoOptions.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>
          </div>

          {/* Weight & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="weight_tonnes" className="block text-sm font-bold text-brand-navy mb-1">
                Weight (Tonnes)
              </label>
              <input
                id="weight_tonnes"
                type="number"
                min="0"
                step="0.01"
                value={form.weight_tonnes}
                onChange={setField('weight_tonnes')}
                placeholder="e.g. 9.5"
                className={`${inputClass} ${fieldErrors.weight_tonnes ? errorInputClass : ''}`}
              />
              <FieldError>{fieldErrors.weight_tonnes}</FieldError>
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-bold text-brand-navy mb-1">
                Price (₹) <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="price"
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.price}
                  onChange={setField('price')}
                  placeholder="e.g. 25000"
                  className={`${inputClass} pl-8 ${fieldErrors.price ? errorInputClass : ''}`}
                />
              </div>
              <FieldError>{fieldErrors.price}</FieldError>
            </div>
          </div>

          {/* Schedule: pickup date + time, then delivery date */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-3">
            <p className="text-xs font-bold text-brand-navy uppercase tracking-wide flex items-center gap-1.5">
              <CalendarDays size={13} className="text-brand-orange" />
              Schedule
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pickup_date" className="block text-sm font-bold text-brand-navy mb-1">
                  Pickup Date <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="pickup_date"
                  required
                  type="date"
                  min={todayISODate()}
                  value={form.pickup_date}
                  onChange={setField('pickup_date')}
                  className={`${inputClass} ${fieldErrors.pickup_date ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.pickup_date}</FieldError>
              </div>

              <div>
                <label htmlFor="pickup_time" className="block text-sm font-bold text-brand-navy mb-1">
                  Pickup Time <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="pickup_time"
                  required
                  type="time"
                  value={form.pickup_time}
                  onChange={setField('pickup_time')}
                  className={`${inputClass} ${fieldErrors.pickup_time ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.pickup_time}</FieldError>
              </div>

              <div>
                <label htmlFor="delivery_date" className="block text-sm font-bold text-brand-navy mb-1">
                  Delivery Date <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="delivery_date"
                  required
                  type="date"
                  min={deliveryMin}
                  value={form.delivery_date}
                  onChange={setField('delivery_date')}
                  className={`${inputClass} ${fieldErrors.delivery_date ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.delivery_date}</FieldError>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="payment_method" className="block text-sm font-bold text-brand-navy mb-1">
              Payment Method <span className="text-brand-orange">*</span>
            </label>
            <div className="relative">
              <select
                id="payment_method"
                required
                value={form.payment_method}
                onChange={setField('payment_method')}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer ${fieldErrors.payment_method ? errorInputClass : 'border-gray-300'}`}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                <ChevronDown size={15} />
              </div>
            </div>
            <FieldError>{fieldErrors.payment_method}</FieldError>
          </div>

          {/* ── Pickup & Delivery Details ── */}
          <div className="rounded-lg border-2 border-dashed border-brand-orange/30 bg-brand-orange/[0.03] p-4 space-y-4">
            <div className="flex items-start gap-2">
              <Lock size={14} className="text-brand-orange shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Addresses and phone numbers are shared only with the driver you approve.
              </p>
            </div>

            {/* Pickup Address */}
            <div>
              <label htmlFor="pickup_address" className="block text-sm font-bold text-brand-navy mb-1">
                Pickup Address <span className="text-brand-orange">*</span>
              </label>
              <textarea
                id="pickup_address"
                required
                rows="3"
                value={form.pickup_address}
                onChange={setField('pickup_address')}
                placeholder="e.g. Warehouse 14, Sarkhej-Gandhinagar Highway, Ahmedabad, Gujarat 380054"
                className={`${inputClass} resize-none ${fieldErrors.pickup_address ? errorInputClass : ''}`}
              />
              <FieldError>{fieldErrors.pickup_address}</FieldError>
            </div>

            {/* Pickup Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pickup_contact_name" className="block text-sm font-bold text-brand-navy mb-1">
                  Pickup Contact Name <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="pickup_contact_name"
                  required
                  type="text"
                  value={form.pickup_contact_name}
                  onChange={setField('pickup_contact_name')}
                  placeholder="e.g. Ramesh Patel"
                  className={`${inputClass} ${fieldErrors.pickup_contact_name ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.pickup_contact_name}</FieldError>
              </div>

              <div>
                <label htmlFor="pickup_contact_phone" className="block text-sm font-bold text-brand-navy mb-1">
                  Pickup Contact Phone <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="pickup_contact_phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.pickup_contact_phone}
                  onChange={setPhoneField('pickup_contact_phone')}
                  onBlur={() => {
                    if (form.pickup_contact_phone && !INDIAN_PHONE_RE.test(form.pickup_contact_phone)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        pickup_contact_phone: 'Enter a valid 10-digit Indian mobile number (starts 6-9).'
                      }));
                    }
                  }}
                  placeholder="e.g. 98XXXXXXXX"
                  className={`${inputClass} ${fieldErrors.pickup_contact_phone ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.pickup_contact_phone}</FieldError>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label htmlFor="delivery_address" className="block text-sm font-bold text-brand-navy mb-1">
                Delivery Address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="delivery_address"
                rows="3"
                value={form.delivery_address}
                onChange={setField('delivery_address')}
                placeholder="e.g. Leave blank if the driver should call the receiver on arrival"
                className={`${inputClass} resize-none ${fieldErrors.delivery_address ? errorInputClass : ''}`}
              />
              <FieldError>{fieldErrors.delivery_address}</FieldError>
              <p className="text-[11px] text-gray-400 mt-1">
                If left blank, the driver is asked to call the receiver for the address.
              </p>
            </div>

            {/* Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="receiver_name" className="block text-sm font-bold text-brand-navy mb-1">
                  Receiver Name <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="receiver_name"
                  required
                  type="text"
                  value={form.receiver_name}
                  onChange={setField('receiver_name')}
                  placeholder="e.g. Sunita Desai"
                  className={`${inputClass} ${fieldErrors.receiver_name ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.receiver_name}</FieldError>
              </div>

              <div>
                <label htmlFor="receiver_phone" className="block text-sm font-bold text-brand-navy mb-1">
                  Receiver Phone <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="receiver_phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.receiver_phone}
                  onChange={setPhoneField('receiver_phone')}
                  onBlur={() => {
                    if (form.receiver_phone && !INDIAN_PHONE_RE.test(form.receiver_phone)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        receiver_phone: 'Enter a valid 10-digit Indian mobile number (starts 6-9).'
                      }));
                    }
                  }}
                  placeholder="e.g. 98XXXXXXXX"
                  className={`${inputClass} ${fieldErrors.receiver_phone ? errorInputClass : ''}`}
                />
                <FieldError>{fieldErrors.receiver_phone}</FieldError>
              </div>
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div>
            <label htmlFor="notes" className="block text-sm font-bold text-brand-navy mb-1 flex items-center gap-1.5">
              <StickyNote size={14} className="text-brand-orange" />
              Notes / Special Instructions
            </label>
            <textarea
              id="notes"
              rows="3"
              value={form.notes}
              onChange={setField('notes')}
              placeholder="e.g. Load must be covered with tarpaulin. Unloading at gate 2. Contact on arrival."
              className={`${inputClass} resize-none ${fieldErrors.notes ? errorInputClass : ''}`}
            />
            <FieldError>{fieldErrors.notes}</FieldError>
          </div>
        </form>
        </div>

        {/* Pinned footer: the submit button is reachable without scrolling to
            the bottom of a form that is taller than the viewport. */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
          <button
            type="submit"
            form="post-trip-form"
            disabled={loading}
            className="w-full py-2.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-brand-navy-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" />Saving...</> : editTrip ? 'Update Trip' : 'Post Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Reason Modal ───────────────────────────────────────────────────────
function RejectReasonModal({ isOpen, onClose, onConfirm, driverName, loading }) {
  const [reason, setReason] = useState('');
  const QUICK_REASONS = [
    'Rate / Price not agreed',
    'Vehicle specifications do not match load',
    'Position already filled by another driver',
    'Driver unavailable for requested dates',
    'Load requirements or schedule changed'
  ];

  useEffect(() => {
    setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold text-brand-navy mb-1 flex items-center gap-2">
          <XCircle size={20} className="text-red-500" />
          Reject Application
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Applicant: <span className="font-semibold text-brand-navy">{driverName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Why is this application being rejected? <span className="text-red-500">*</span>
            </label>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                    reason === r
                      ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Reason Textarea */}
            <textarea
              required
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter feedback or explain why this application was declined..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              This reason will be visible to the driver when they click the info icon on their dashboard.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── OTP Share Card ────────────────────────────────────────────────────────────
/**
 * The two OTPs, each with a Share on WhatsApp button.
 *
 * The wa.me links and their message text are built server-side (see
 * GET /api/trips/:id/otp-links) so the message wording is defined in one place
 * and cannot drift between the two contacts.
 */
function OtpShareCard({ links, driverName }) {
  if (!links) return null;

  const items = [
    {
      key: 'pickup',
      label: 'Pickup OTP',
      otp: links.pickup_otp,
      phone: links.pickup_contact_phone,
      url: links.pickup_whatsapp_url,
      hint: 'Share with the pickup contact. The driver enters this to collect the load.'
    },
    {
      key: 'delivery',
      label: 'Delivery OTP',
      otp: links.delivery_otp,
      phone: links.receiver_phone,
      url: links.delivery_whatsapp_url,
      hint: 'Share with the receiver. The driver enters this to confirm drop-off.'
    }
  ];

  return (
    <div className="mt-3 mb-3 p-3 rounded-lg border-2 border-brand-orange/30 bg-brand-orange/[0.04]">
      <p className="text-xs font-bold text-brand-navy uppercase tracking-wide flex items-center gap-1.5 mb-1">
        <KeyRound size={13} className="text-brand-orange" />
        OTPs{driverName ? ` for ${driverName}` : ''}
      </p>
      <p className="text-[11px] text-gray-500 mb-3">
        Only you can see these. Send each code to the matching contact on WhatsApp.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div key={item.key} className="p-2.5 rounded-lg bg-white border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{item.label}</p>
            <p className="text-2xl font-mono font-bold text-brand-navy tracking-[0.3em] my-1.5">
              {item.otp}
            </p>
            <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">{item.hint}</p>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={13} /> Share on WhatsApp
              </a>
            ) : (
              // The server withholds the link when the stored number is not a
              // valid Indian mobile, which is the case for rows backfilled by
              // the migration. Read the code out and pass it on directly.
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
                No valid number on file for this contact — read the code out to them instead.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Applicants Panel ──────────────────────────────────────────────────────────
function ApplicantsPanel({ tripId, trip, authFetch, onDecision }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [rejectModalTarget, setRejectModalTarget] = useState(null); // { appId, driverName }
  const [otpLinks, setOtpLinks] = useState(null);

  /**
   * Applicants and, once a driver is approved, the two OTPs with their
   * ready-to-send WhatsApp links. Both are read together so the panel renders
   * in one pass after an approval instead of popping the OTP card in later.
   *
   * There is deliberately no reload call in handleAccept/handleConfirmReject:
   * onDecision() refreshes the parent, which hands down a new trip.status and
   * applicant_count, and those are the effect's dependencies — so the reload
   * happens through the effect rather than as a second request.
   */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/trips/${tripId}/applicants`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load applicants.');
        setApplicants(data.applicants || []);

        // Before approval the OTPs endpoint answers 400, which just means
        // there is no card to show yet.
        const approved = (data.applicants || []).some((a) => a.application_status === 'accepted');
        if (approved) {
          const otpRes = await authFetch(`/trips/${tripId}/otp-links`);
          const otpData = await otpRes.json();
          setOtpLinks(otpRes.ok ? otpData : null);
        } else {
          setOtpLinks(null);
        }
      } catch {
        setApplicants([]);
        setOtpLinks(null);
      } finally {
        setLoading(false);
      }
    };
    if (tripId) load();
  }, [tripId, authFetch, trip.applicant_count, trip.status]);

  const handleAccept = async (appId) => {
    setActionLoading(appId);
    setMsg({ type: '', text: '' });
    try {
      const res = await authFetch(`/applications/${appId}/accept`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ type: 'success', text: 'Driver approved. Share the OTPs below — they have 2 hours to confirm.' });
      onDecision(); // refreshes the trip, which re-runs the effect above
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!rejectModalTarget) return;
    const appId = rejectModalTarget.appId;
    setActionLoading(appId);
    setMsg({ type: '', text: '' });
    try {
      const res = await authFetch(`/applications/${appId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ rejection_reason: reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ type: 'success', text: 'Application rejected with reason provided.' });
      setRejectModalTarget(null);
      onDecision(); // refreshes the trip, which re-runs the effect above
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const applicantCount = applicants.length;

  if (loading) return <div className="py-6 flex justify-center"><Loader2 size={22} className="animate-spin text-brand-orange" /></div>;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-brand-navy uppercase tracking-wide flex items-center gap-1.5">
          <Users size={13} className="text-brand-orange" />
          Applicants
        </p>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-brand-orange text-white text-xs font-bold">
          {applicantCount}
        </span>
      </div>
      {msg.text && (
        <div className={`mb-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span>{msg.text}</span>
        </div>
      )}

      <OtpShareCard
        links={otpLinks}
        driverName={applicants.find((a) => a.application_status === 'accepted')?.driver_name}
      />
      {applicants.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No applicants yet.</p>
      ) : (
        <div className="space-y-2">
          {applicants.map((a) => (
            <div key={a.application_id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {a.driver_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-navy truncate">{a.driver_name}</p>
                  <p className="text-xs text-gray-400 truncate">{a.driver_email} · {a.driver_phone}</p>
                </div>
                <StatusBadge status={a.application_status} />
                {a.application_status === 'pending' && trip.status === 'open' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAccept(a.application_id)}
                      disabled={actionLoading === a.application_id}
                      className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {actionLoading === a.application_id ? <Loader2 size={11} className="animate-spin" /> : 'Accept'}
                    </button>
                    <button
                      onClick={() => setRejectModalTarget({ appId: a.application_id, driverName: a.driver_name })}
                      disabled={actionLoading === a.application_id}
                      className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Show Rejection Reason if present */}
              {a.application_status === 'rejected' && a.rejection_reason && (
                <div className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100 flex items-start gap-1.5">
                  <XCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>Rejection reason:</strong> &ldquo;{a.rejection_reason}&rdquo;
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={!!rejectModalTarget}
        onClose={() => setRejectModalTarget(null)}
        onConfirm={handleConfirmReject}
        driverName={rejectModalTarget?.driverName || ''}
        loading={actionLoading === rejectModalTarget?.appId}
      />
    </div>
  );
}

// ─── Trip Card (Operator) ──────────────────────────────────────────────────────
function OperatorTripCard({ trip, authFetch, onEdit, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const applicantCount = Number(trip.applicant_count) || 0;

  /**
   * Reassign is only offered once the deadline has actually passed. The server
   * enforces the same rule, so this is presentation only — the button simply
   * avoids appearing before it can succeed.
   */
  const canReassign = trip.status === 'assigned' && isConfirmExpired(trip.confirm_by);
  const canConfirmDelivery = trip.status === 'delivered';
  const canMarkPaid = trip.status === 'completed' && trip.payment_status !== 'paid';

  const act = async (key, fn) => {
    setBusy(key);
    setStatusMsg({ type: '', text: '' });
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBusy('');
    }
  };

  const handleReassign = () => {
    if (!window.confirm('Reopen this trip and clear the current driver? They missed the 2-hour confirmation window.')) return;
    act('reassign', async () => {
      const res = await authFetch(`/trips/${trip.id}/reassign`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg({ type: 'success', text: 'Trip reopened. Approve another driver from the applicants list.' });
    });
  };

  const handleConfirmDelivery = () => {
    act('confirm', async () => {
      const res = await authFetch(`/trips/${trip.id}/confirm-delivery`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg({ type: 'success', text: 'Delivery confirmed. Trip completed.' });
    });
  };

  const handleMarkPaid = () => {
    act('payment', async () => {
      const res = await authFetch(`/trips/${trip.id}/payment`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg({ type: 'success', text: data.message });
    });
  };

  const handleCancel = () => {
    if (!window.confirm('Cancel this trip? The driver will be notified.')) return;
    act('cancel', async () => {
      const res = await authFetch(`/trips/${trip.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg({ type: 'success', text: 'Trip cancelled.' });
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      const res = await authFetch(`/trips/${trip.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete trip.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Trip header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {trip.load_reference && (
              <span className="px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy font-mono text-xs font-bold tracking-wide">
                #{trip.load_reference}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
              <MapPin size={13} className="text-brand-orange shrink-0" />
              <span className="truncate">{trip.source}</span>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{trip.destination}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-medium text-brand-navy">
              <Truck size={12} className="text-brand-orange" />
              {trip.vehicle_type}
            </span>
            {trip.cargo_type && (
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                {trip.cargo_type}
              </span>
            )}
            {trip.weight_tonnes && (
              <span className="text-gray-600 text-xs">
                {trip.weight_tonnes} tonnes
              </span>
            )}
            <span className="flex items-center gap-1 font-bold text-gray-800">
              <IndianRupee size={12} className="text-brand-orange" />
              {formatINR(trip.price)}
            </span>
            {trip.payment_method && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${paymentMethodStyle(trip.payment_method)}`}>
                <CreditCard size={10} />
                {paymentMethodLabel(trip.payment_method)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={11} />
              {applicantCount} applicant{applicantCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Schedule */}
          {(trip.pickup_date || trip.delivery_date) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-100">
              {trip.pickup_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} className="text-brand-orange" />
                  <span className="text-gray-400">Pickup:</span>
                  <span className="font-semibold text-brand-navy">
                    {formatTripDate(trip.pickup_date)}
                    {trip.pickup_time && ` · ${formatTripTime(trip.pickup_time)}`}
                  </span>
                </span>
              )}
              {trip.delivery_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} className="text-brand-orange" />
                  <span className="text-gray-400">Delivery:</span>
                  <span className="font-semibold text-brand-navy">{formatTripDate(trip.delivery_date)}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <StatusBadge status={trip.status} />
      </div>

      {/* No-update warning: in transit and silent for 6+ hours */}
      {trip.no_update_alert && (
        <div className="mt-2 mb-1 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle size={13} className="shrink-0" />
          <span>
            No update for {trip.hours_since_update == null ? 'a while' : `${trip.hours_since_update} hrs`}
            {trip.driver_name ? ` from ${trip.driver_name}` : ''}.
          </span>
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {canReassign && (
          <button
            onClick={handleReassign}
            disabled={busy === 'reassign'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {busy === 'reassign' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Reassign Driver
          </button>
        )}

        {canConfirmDelivery && (
          <button
            onClick={handleConfirmDelivery}
            disabled={busy === 'confirm'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {busy === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Confirm Delivery
          </button>
        )}

        {canMarkPaid && (
          <button
            onClick={handleMarkPaid}
            disabled={busy === 'payment'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-bold hover:bg-brand-navy-mid transition-colors disabled:opacity-60"
          >
            {busy === 'payment' ? <Loader2 size={12} className="animate-spin" /> : <IndianRupee size={12} />}
            Mark Payment as Paid
          </button>
        )}

        {['open', 'assigned', 'confirmed'].includes(trip.status) && (
          <button
            onClick={handleCancel}
            disabled={busy === 'cancel'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {busy === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Cancel Trip
          </button>
        )}

        {/* Applicants toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
        >
          <Users size={12} />
          {expanded ? 'Hide' : 'View'} Applicants
          <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${
            applicantCount > 0 ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {applicantCount}
          </span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Edit */}
        {['open', 'assigned'].includes(trip.status) && (
          <button
            onClick={() => onEdit(trip)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={12} /> Edit
          </button>
        )}

        {/* Delete */}
        {['open', 'cancelled'].includes(trip.status) && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>

      {statusMsg.text && (
        <p className={`text-xs mt-2 ${statusMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {statusMsg.text}
        </p>
      )}

      {/* Applicants panel — also hosts the OTP share card after approval */}
      {expanded && (
        <ApplicantsPanel tripId={trip.id} trip={trip} authFetch={authFetch} onDecision={onRefresh} />
      )}

      {/* Proof photo and rating, once the trip is delivered and completed */}
      {(trip.status === 'delivered' || trip.status === 'completed') && (
        <TripCloseout trip={trip} authFetch={authFetch} />
      )}
    </div>
  );
}

// ─── Trip Closeout ─────────────────────────────────────────────────────────────
/**
 * Everything the operator sees once the driver has delivered: the proof photo
 * they uploaded, and after completion the payment status plus the 1-5 rating
 * form. Split from the card so it can own its own fetch and message state.
 */
function TripCloseout({ trip, authFetch }) {
  const [rating, setRating] = useState({ stars: 0, comment: '' });
  const [existingRating, setExistingRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (trip.status !== 'completed') return;

    // The trip payload does not carry the rating, so it is fetched here to
    // decide between the form and the read-only view. A failure just leaves
    // the form available — the POST would surface the real problem anyway.
    const load = async () => {
      try {
        const res = await authFetch(`/trips/${trip.id}/rating`);
        const data = await res.json();
        if (res.ok && data.rating) setExistingRating(data.rating);
      } catch {
        // Non-fatal
      }
    };
    load();
  }, [trip.id, trip.status, authFetch]);

  const submitRating = async (event) => {
    event.preventDefault();
    if (rating.stars < 1) {
      setMsg({ type: 'error', text: 'Choose a star rating first.' });
      return;
    }
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await authFetch(`/trips/${trip.id}/rating`, {
        method: 'POST',
        body: JSON.stringify({ stars: rating.stars, comment: rating.comment.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setExistingRating(data.rating);
      setRating({ stars: 0, comment: '' });
      setMsg({ type: 'success', text: 'Thanks for rating this trip.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Could not save the rating.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      {trip.delivery_proof_url && (
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Camera size={12} className="text-brand-orange" /> Delivery proof
          </p>
          <a href={apiAssetUrl(trip.delivery_proof_url)} target="_blank" rel="noopener noreferrer">
            <img
              src={apiAssetUrl(trip.delivery_proof_url)}
              alt="Delivery proof"
              className="w-full max-w-xs h-40 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      )}

      {trip.status === 'completed' && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Payment:</span>
            {trip.payment_status === 'paid' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-semibold">
                <CheckCircle size={11} /> Paid via {paymentMethodLabel(trip.payment_method)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
                Pending via {paymentMethodLabel(trip.payment_method)}
              </span>
            )}
          </div>

          {existingRating ? (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-brand-navy mb-1">Your rating</p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={star <= existingRating.stars ? 'text-brand-orange' : 'text-gray-300'}
                    fill={star <= existingRating.stars ? 'currentColor' : 'none'}
                  />
                ))}
                <span className="text-xs text-gray-500 ml-1.5">{existingRating.stars}/5</span>
              </div>
              {existingRating.comment && (
                <p className="text-xs text-gray-600 mt-1.5 italic">&ldquo;{existingRating.comment}&rdquo;</p>
              )}
            </div>
          ) : (
            <form onSubmit={submitRating} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-brand-navy mb-2">
                Rate {trip.driver_name || 'this driver'}
              </p>
              <div className="flex items-center gap-1 mb-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating((r) => ({ ...r, stars: star }))}
                    title={`${star} star${star === 1 ? '' : 's'}`}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      size={22}
                      className={star <= rating.stars ? 'text-brand-orange' : 'text-gray-300'}
                      fill={star <= rating.stars ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
                {rating.stars > 0 && (
                  <span className="text-xs text-gray-500 ml-1.5">{rating.stars}/5</span>
                )}
              </div>
              <textarea
                rows="2"
                value={rating.comment}
                onChange={(e) => setRating((r) => ({ ...r, comment: e.target.value }))}
                placeholder="e.g. On time, careful with the load. Would hire again."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 px-4 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-mid transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} />}
                Submit Rating
              </button>
            </form>
          )}
        </>
      )}

      {msg.text && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const { user, logout, authFetch } = useAuth();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if not operator
  useEffect(() => {
    if (user && user.role !== 'fleet_operator') {
      window.location.href = user.role === 'owner_driver' ? '/dashboard/driver' : '/';
    }
  }, [user]);

  const fetchMyTrips = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await authFetch('/trips/my');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load your trips.');
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to load your trips.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchMyTrips(); }, [fetchMyTrips]);

  const handlePostSuccess = (action) => {
    setSuccessMsg(`Trip ${action} successfully!`);
    fetchMyTrips();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleLogout = () => { logout(); window.location.href = '/'; };

  // Stats
  const stats = {
    total:       trips.length,
    open:        trips.filter(t => t.status === 'open').length,
    assigned:    trips.filter(t => t.status === 'assigned').length,
    in_progress: trips.filter(t => t.status === 'in_progress').length,
    completed:   trips.filter(t => t.status === 'completed').length,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-navy shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <svg width="32" height="32" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="17" stroke="#F68520" strokeWidth="2" fill="none" />
              <circle cx="19" cy="19" r="11.5" stroke="#F68520" strokeWidth="1.5" fill="none" />
              <circle cx="19" cy="19" r="6" stroke="#F68520" strokeWidth="1.5" fill="none" />
              <circle cx="19" cy="3.5" r="2.5" fill="#F68520" />
              <circle cx="19" cy="34.5" r="2.5" fill="#F68520" />
              <circle cx="3.5" cy="19" r="2.5" fill="#F68520" />
              <circle cx="34.5" cy="19" r="2.5" fill="#F68520" />
            </svg>
            <span className="text-white font-bold text-sm hidden sm:block">FleetLink</span>
          </a>

          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-brand-orange" />
            <h1 className="text-white font-bold text-base">Operator Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-semibold truncate max-w-[130px]">{user.name}</p>
              <p className="text-white/50 text-[10px]">Fleet Operator</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10">
          <div className="w-12 h-12 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-xl shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-brand-navy">Welcome, {user.name}!</h2>
            <p className="text-sm text-gray-500">{user.company_name || 'Your Fleet'} · Post trips and manage your drivers below.</p>
          </div>
          <button
            onClick={() => { setEditTrip(null); setIsPostOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white text-sm font-bold rounded-xl hover:bg-orange-500 transition-colors shadow-sm shrink-0"
          >
            <Plus size={17} />
            Post New Trip
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Trips', value: stats.total, color: 'text-brand-navy' },
            { label: 'Open', value: stats.open, color: 'text-blue-600' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-orange-600' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Success msg */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}

        {/* Trips List */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-brand-navy">Your Posted Trips</h3>
          <button onClick={fetchMyTrips} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-orange" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertCircle size={36} className="text-red-400 mb-2" />
            <p className="text-gray-600 text-sm">{error}</p>
            <button onClick={fetchMyTrips} className="mt-3 px-4 py-2 bg-brand-navy text-white text-sm rounded-lg">Retry</button>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Briefcase size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold">No trips posted yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Post New Trip" to get started.</p>
            <button onClick={() => { setEditTrip(null); setIsPostOpen(true); }} className="mt-4 px-5 py-2 bg-brand-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2">
              <Plus size={16} /> Post New Trip
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <OperatorTripCard
                key={trip.id}
                trip={trip}
                authFetch={authFetch}
                onEdit={(t) => { setEditTrip(t); setIsPostOpen(true); }}
                onDelete={fetchMyTrips}
                onRefresh={() => fetchMyTrips({ silent: true })}
              />
            ))}
          </div>
        )}
      </main>

      {/* Post / Edit Trip Modal */}
      <PostTripModal
        isOpen={isPostOpen}
        onClose={() => { setIsPostOpen(false); setEditTrip(null); }}
        onSuccess={handlePostSuccess}
        authFetch={authFetch}
        editTrip={editTrip}
      />
    </div>
  );
}
