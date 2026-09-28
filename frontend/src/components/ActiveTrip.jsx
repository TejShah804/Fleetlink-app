// The driver's Active Trip page: everything needed to run one load, from the
// unlocked address to the delivery OTP and the milestone timeline.
//
// No maps, by design — the address is text to read out and a phone number to
// call, which is what a driver actually needs on a job.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin, PhoneCall, Loader2, AlertCircle, CheckCircle, X,
  Camera, RefreshCw, MessageSquare, Flag, Send, PackageCheck, Navigation,
  KeyRound, Image as ImageIcon, Trash2, Clock, Truck, IndianRupee, Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatINR, formatTripDate, formatTripTime, formatDateTime } from '@/lib/format';
import { paymentMethodLabel, paymentMethodStyle } from '@/lib/tripOptions';
import {
  statusLabel,
  statusStyle,
  updateTypeLabel,
  driverActions,
  telLink
} from '@/lib/tripStatus';

/** Timeline icon per type, so the list scans without reading every label. */
const UPDATE_ICONS = {
  reached_pickup: <Navigation size={12} />,
  loaded: <PackageCheck size={12} />,
  checkpoint: <MessageSquare size={12} />,
  delay: <Flag size={12} />,
  reached_destination: <MapPin size={12} />,
  delivered: <CheckCircle size={12} />
};

// ─── Address + Call cards ─────────────────────────────────────────────────────
/**
 * "Ramesh · 9876543210", or null when the server has not released it yet —
 * a template literal over undefined values would otherwise render
 * "undefined · undefined" in the contact line.
 */
function joinNamePhone(name, phone) {
  if (!name && !phone) return null;
  return [name, phone].filter(Boolean).join(' · ');
}

/**
 * One address/contact block.
 *
 * `locked` covers the pre-confirmation case: the server NULLs the address and
 * contacts while a trip is still only 'assigned', so this explains the absence
 * rather than rendering blanks.
 */
function ContactCard({ icon: Icon, label, value, contact, phone, accent, locked }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? 'border-brand-orange/30 bg-brand-orange/[0.04]' : 'border-gray-200 bg-white'}`}>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
        <Icon size={12} className="text-brand-orange" />
        {label}
      </p>
      {value ? (
        <p className="text-sm text-brand-navy leading-relaxed whitespace-pre-line">{value}</p>
      ) : locked ? (
        <p className="text-sm text-gray-500 italic flex items-center gap-1.5">
          <Lock size={12} /> Unlocks when you confirm this trip
        </p>
      ) : (
        <p className="text-sm text-gray-500 italic">
          Address not provided, please call the receiver
        </p>
      )}
      {contact && <p className="text-xs text-gray-500 mt-1">{contact}</p>}

      {phone && (
        <a
          href={telLink(phone)}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-mid transition-colors"
        >
          <PhoneCall size={13} /> Call
        </a>
      )}
    </div>
  );
}

// ─── OTP Modal ────────────────────────────────────────────────────────────────
/**
 * Shared by pickup and delivery. Delivery adds the optional proof photo, which
 * is why `allowProof` and `onSubmit` are parameters rather than hardcoded.
 */
function OtpModal({ open, title, description, allowProof, onClose, onSubmit }) {
  const [otp, setOtp] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Object URLs are revoked on change/unmount, otherwise every preview leaks
  // the whole image until the tab closes.
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open) return null;

  const reset = () => {
    setOtp('');
    setFile(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!/^\d{4}$/.test(otp.trim())) {
      setError('Enter the 4-digit OTP.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(otp.trim(), file);
      reset();
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = (selected) => {
    if (!selected) return;
    if (!['image/jpeg', 'image/png'].includes(selected.type)) {
      setError('Proof photo must be a JPG or PNG image.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('Proof photo must be 5 MB or smaller.');
      return;
    }
    setError('');
    setFile(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
            <KeyRound size={20} />
          </div>
          <h3 className="text-lg font-bold text-brand-navy">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">{description}</p>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="otp" className="block text-sm font-bold text-brand-navy mb-1.5">
            4-digit OTP
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
          />

          {allowProof && (
            <div className="mt-4">
              <label className="block text-sm font-bold text-brand-navy mb-1.5">
                Delivery proof photo <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Delivery proof preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-white/90 text-gray-600 rounded-lg hover:bg-white"
                      title="Change photo"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1.5 bg-white/90 text-red-600 rounded-lg hover:bg-white"
                      title="Remove photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                    <ImageIcon size={11} /> {file.name}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-brand-orange hover:text-brand-orange transition-colors flex flex-col items-center gap-1.5"
                >
                  <Camera size={22} />
                  <span className="text-xs font-semibold">Take or choose a photo</span>
                  <span className="text-[10px] text-gray-400">JPG or PNG, up to 5 MB</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 py-2.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-brand-navy-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <><Loader2 size={15} className="animate-spin" />Verifying...</> : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ updates, loading }) {
  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 size={20} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  if (updates.length === 0) {
    return <p className="py-6 text-center text-xs text-gray-400">No updates logged yet.</p>;
  }

  return (
    <ol className="relative space-y-4 pl-6">
      {/* The vertical rail, drawn behind the dots */}
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
      {updates.map((update) => (
        <li key={update.id} className="relative">
          <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-brand-orange flex items-center justify-center text-brand-orange">
            {UPDATE_ICONS[update.type] || <MessageSquare size={12} />}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-bold text-brand-navy">{updateTypeLabel(update.type)}</p>
            <p className="text-[10px] text-gray-400 whitespace-nowrap">{formatDateTime(update.created_at)}</p>
          </div>
          {update.message && (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{update.message}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

// ─── Active Trip card ─────────────────────────────────────────────────────────
function ActiveTripCard({ trip, authFetch, onChanged }) {
  const [updates, setUpdates] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [modal, setModal] = useState(null); // 'pickup' | 'delivery'
  const [updateDraft, setUpdateDraft] = useState({ type: 'checkpoint', message: '' });
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const actions = driverActions(trip.status);
  // Five wrong OTP entries locks verification for this trip
  const isOtpLocked = trip.otp_attempts >= 5;
  // Addresses and contacts are released by the server only once confirmed
  const isAddressLocked = trip.status === 'assigned';

  const fetchUpdates = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await authFetch(`/trips/${trip.id}/timeline`);
      const data = await res.json();
      if (res.ok) setUpdates(data.updates || []);
    } catch {
      // A timeline that fails to load should not block the actions above it
    } finally {
      setTimelineLoading(false);
    }
  }, [authFetch, trip.id]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const run = async (key, fn) => {
    setBusy(key);
    setMsg({ type: '', text: '' });
    try {
      await fn();
      await Promise.all([fetchUpdates(), onChanged()]);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBusy('');
    }
  };

  const logMilestone = (type) => {
    const label = { reached_pickup: 'Reached Pickup', reached_destination: 'Reached Destination' }[type];
    run(type, async () => {
      const res = await authFetch(`/trips/${trip.id}/updates`, {
        method: 'POST',
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ type: 'success', text: `${label} logged. The operator has been notified.` });
    });
  };

  const submitUpdate = async (event) => {
    event.preventDefault();
    const { type, message } = updateDraft;
    run('update', async () => {
      const res = await authFetch(`/trips/${trip.id}/updates`, {
        method: 'POST',
        body: JSON.stringify({ type, message: message.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUpdateDraft({ type: 'checkpoint', message: '' });
      setShowUpdateForm(false);
      setMsg({ type: 'success', text: 'Update sent to the operator.' });
    });
  };

  const verifyPickup = async (otp) => {
    const res = await authFetch(`/trips/${trip.id}/verify-pickup`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
    const data = await res.json();
    if (!res.ok) {
      // The attempt counter is server-side, so the message is authoritative
      setMsg({ type: 'error', text: data.message });
      throw new Error(data.message);
    }
    setModal(null);
    setMsg({ type: 'success', text: 'Pickup verified. The load is now in transit.' });
    await Promise.all([fetchUpdates(), onChanged()]);
  };

  const verifyDelivery = async (otp, file) => {
    // multipart is required here so the photo can ride along with the OTP
    const formData = new FormData();
    formData.append('otp', otp);
    if (file) formData.append('proof', file);

    const token = localStorage.getItem('fleetlink_token');
    const res = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/trips/${trip.id}/verify-delivery`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text: data.message });
      throw new Error(data.message);
    }
    setModal(null);
    setMsg({ type: 'success', text: 'Delivery verified. Waiting for the operator to confirm.' });
    await Promise.all([fetchUpdates(), onChanged()]);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-brand-navy">#{trip.load_reference}</p>
          <div className="flex items-center gap-1.5 text-sm text-brand-navy mt-0.5">
            <MapPin size={14} className="text-brand-orange shrink-0" />
            <span className="font-semibold truncate">{trip.source}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold truncate">{trip.destination}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${statusStyle(trip.status)}`}>
          {statusLabel(trip.status).toUpperCase()}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {msg.text && (
          <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
            msg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.type === 'success'
              ? <CheckCircle size={14} className="shrink-0 mt-0.5" />
              : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}

        {isOtpLocked && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>
              5 failed OTP attempts. The trip is locked and the operator has been notified.
            </span>
          </div>
        )}

        {/* Trip facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-gray-400">Pickup</p>
            <p className="font-semibold text-brand-navy">
              {formatTripDate(trip.pickup_date)}
              {trip.pickup_time && ` · ${formatTripTime(trip.pickup_time)}`}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Delivery</p>
            <p className="font-semibold text-brand-navy">{formatTripDate(trip.delivery_date)}</p>
          </div>
          <div>
            <p className="text-gray-400">Amount</p>
            <p className="font-semibold text-brand-navy flex items-center gap-1">
              <IndianRupee size={11} className="text-brand-orange" />
              {formatINR(trip.price)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Payment</p>
            <span className={`inline-block px-1.5 py-0.5 rounded border text-[11px] font-semibold ${paymentMethodStyle(trip.payment_method)}`}>
              {paymentMethodLabel(trip.payment_method)}
            </span>
          </div>
        </div>

        {/* Addresses — the reason for confirming */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactCard
            icon={MapPin}
            label="Pickup address"
            value={trip.pickup_address}
            contact={joinNamePhone(trip.pickup_contact_name, trip.pickup_contact_phone)}
            phone={trip.pickup_contact_phone}
            accent
            locked={isAddressLocked}
          />
          <ContactCard
            icon={Navigation}
            label="Delivery address"
            value={trip.delivery_address}
            contact={joinNamePhone(trip.receiver_name, trip.receiver_phone)}
            phone={trip.receiver_phone}
            locked={isAddressLocked}
          />
        </div>

        {trip.notes && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-gray-700">
            <span className="font-bold text-amber-800">Note from operator:</span> {trip.notes}
          </div>
        )}

        {/* Milestones */}
        {actions.canLogMilestones && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
              Trip progress
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => logMilestone('reached_pickup')}
                disabled={busy === 'reached_pickup'}
                className="px-3 py-2 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-mid transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {busy === 'reached_pickup'
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Navigation size={13} />}
                Reached Pickup
              </button>

              <button
                onClick={() => setShowUpdateForm((prev) => !prev)}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <MessageSquare size={13} /> Post Update / Report Delay
              </button>

              <button
                onClick={() => logMilestone('reached_destination')}
                disabled={busy === 'reached_destination'}
                className="px-3 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {busy === 'reached_destination'
                  ? <Loader2 size={13} className="animate-spin" />
                  : <MapPin size={13} />}
                Reached Destination
              </button>
            </div>

            {showUpdateForm && (
              <form onSubmit={submitUpdate} className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5">
                <div className="flex gap-2">
                  {[
                    { value: 'checkpoint', label: 'Checkpoint' },
                    { value: 'delay', label: 'Delay' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setUpdateDraft((d) => ({ ...d, type: option.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        updateDraft.type === option.value
                          ? 'bg-brand-navy text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows="2"
                  value={updateDraft.message}
                  onChange={(e) => setUpdateDraft((d) => ({ ...d, message: e.target.value }))}
                  placeholder={updateDraft.type === 'delay'
                    ? 'e.g. Stuck in traffic near Vapi, expecting 2 hours late'
                    : 'e.g. Passed Kheda, about 200 km to go'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy === 'update'}
                    className="px-4 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-mid transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {busy === 'update' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* OTP actions */}
        {(actions.canVerifyPickup || actions.canVerifyDelivery) && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
              Verification
            </p>
            {actions.canVerifyPickup && (
              <button
                onClick={() => setModal('pickup')}
                disabled={isOtpLocked}
                className="w-full sm:w-auto px-4 py-2.5 bg-brand-orange text-white text-sm font-bold rounded-lg hover:bg-brand-orange-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound size={15} /> Enter Pickup OTP
              </button>
            )}
            {actions.canVerifyDelivery && (
              <button
                onClick={() => setModal('delivery')}
                disabled={isOtpLocked}
                className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound size={15} /> Enter Delivery OTP
              </button>
            )}
            {isOtpLocked && (
              <p className="text-[11px] text-red-600 mt-2 font-medium">
                Locked after 5 failed attempts. Contact the operator.
              </p>
            )}
          </div>
        )}

        {actions.canVerifyDelivery && (
          <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
            <Camera size={11} className="shrink-0 mt-0.5" />
            A delivery proof photo is optional but speeds up the operator&apos;s confirmation.
          </p>
        )}

        {/* Timeline */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Clock size={12} className="text-brand-orange" /> Timeline
            </p>
            <button
              onClick={fetchUpdates}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh timeline"
            >
              <RefreshCw size={13} className={timelineLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <Timeline updates={updates} loading={timelineLoading} />
        </div>
      </div>

      <OtpModal
        open={modal === 'pickup'}
        title="Verify Pickup"
        description="Ask the pickup contact for the 4-digit OTP before you load the goods."
        allowProof={false}
        onClose={() => setModal(null)}
        onSubmit={verifyPickup}
      />

      <OtpModal
        open={modal === 'delivery'}
        title="Verify Delivery"
        description="Ask the receiver for the 4-digit OTP at the drop-off point."
        allowProof
        onClose={() => setModal(null)}
        onSubmit={verifyDelivery}
      />
    </div>
  );
}

// ─── Active Trip tab ──────────────────────────────────────────────────────────
export default function ActiveTrip({ trips, loading, error, onRefresh }) {
  // Declared before the early returns below — hooks must run unconditionally
  const { authFetch } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <AlertCircle size={36} className="text-red-400 mb-2" />
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-3 px-4 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-mid transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Truck size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-semibold">No active trip</p>
        <p className="text-gray-400 text-sm mt-1">
          Once you confirm an approved trip it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <ActiveTripCard
          key={trip.id}
          trip={trip}
          authFetch={authFetch}
          onChanged={onRefresh}
        />
      ))}
    </div>
  );
}
