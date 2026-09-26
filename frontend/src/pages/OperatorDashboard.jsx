import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Truck, MapPin, DollarSign, Plus, X, Loader2, CheckCircle,
  AlertCircle, Users, LayoutDashboard, LogOut, RefreshCw,
  ChevronRight, Briefcase, Clock, XCircle, Edit2, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    open:        'bg-blue-100 text-blue-700 border-blue-200',
    assigned:    'bg-purple-100 text-purple-700 border-purple-200',
    in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
    completed:   'bg-green-100 text-green-700 border-green-200',
    cancelled:   'bg-gray-100 text-gray-500 border-gray-200',
    pending:     'bg-yellow-100 text-yellow-700 border-yellow-200',
    accepted:    'bg-green-100 text-green-700 border-green-200',
    rejected:    'bg-red-100 text-red-700 border-red-200',
  };
  const icons = {
    open:        <Truck size={11} />,
    assigned:    <CheckCircle size={11} />,
    in_progress: <Truck size={11} />,
    completed:   <CheckCircle size={11} />,
    cancelled:   <XCircle size={11} />,
    pending:     <Clock size={11} />,
    accepted:    <CheckCircle size={11} />,
    rejected:    <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status]}
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export const VEHICLE_TYPES = [
  'Semi Trailer',
  'B-Double',
  'Road Train',
  'Curtainsider (Tautliner)',
  'Flatbed / Drop Deck',
  'Refrigerated (Reefer)',
  'Heavy Rigid (HR)',
  'Medium Rigid (MR)',
  'Container Skeletal',
  'Tanker',
  'Other'
];

export const CARGO_TYPES = [
  'General Freight',
  'Palletized Goods',
  'Machinery & Equipment',
  'Food & Beverages (Chilled/Frozen)',
  'Building & Construction Materials',
  'Steel & Metals',
  'Agricultural / Produce',
  'Dangerous Goods',
  'Other'
];

function generateLoadReference() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FL-TRP-${rand}`;
}

// ─── Post Trip Modal ───────────────────────────────────────────────────────────
function PostTripModal({ isOpen, onClose, onSuccess, authFetch, editTrip }) {
  const [form, setForm] = useState({
    load_reference: '',
    source: '',
    destination: '',
    vehicle_type: 'Semi Trailer',
    cargo_type: 'General Freight',
    weight_tonnes: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTrip) {
      setForm({
        load_reference: editTrip.load_reference || '',
        source: editTrip.source || '',
        destination: editTrip.destination || '',
        vehicle_type: editTrip.vehicle_type || 'Semi Trailer',
        cargo_type: editTrip.cargo_type || 'General Freight',
        weight_tonnes: editTrip.weight_tonnes || '',
        price: editTrip.price || ''
      });
    } else {
      setForm({
        load_reference: generateLoadReference(),
        source: '',
        destination: '',
        vehicle_type: 'Semi Trailer',
        cargo_type: 'General Freight',
        weight_tonnes: '',
        price: ''
      });
    }
    setError('');
  }, [editTrip, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        load_reference: form.load_reference.trim(),
        source: form.source.trim(),
        destination: form.destination.trim(),
        vehicle_type: form.vehicle_type,
        cargo_type: form.cargo_type || null,
        weight_tonnes: form.weight_tonnes ? parseFloat(form.weight_tonnes) : null,
        price: parseFloat(form.price)
      };

      const res = editTrip
        ? await authFetch(`/trips/${editTrip.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await authFetch('/trips', { method: 'POST', body: JSON.stringify(payload) });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess(editTrip ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 my-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-brand-navy mb-4 flex items-center gap-2">
          <Briefcase size={20} className="text-brand-orange" />
          {editTrip ? 'Edit Trip' : 'Post a New Trip'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Load Reference # (Unique) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-brand-navy">
                Load Reference # <span className="text-brand-orange">*</span>
              </label>
              <span className="text-[11px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-semibold">
                Unique Trip ID
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                required
                value={form.load_reference}
                onChange={(e) => setForm(f => ({ ...f, load_reference: e.target.value.toUpperCase() }))}
                placeholder="e.g. FL-TRP-4021"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm font-mono uppercase focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
              />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, load_reference: generateLoadReference() }))}
                className="absolute right-2 p-1.5 text-gray-400 hover:text-brand-orange transition-colors"
                title="Generate new unique reference code"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Unique tracking identifier for this load. Auto-generated or enter your own reference.
            </p>
          </div>

          {/* Route (From & To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                From (Source) <span className="text-brand-orange">*</span>
              </label>
              <input
                required
                value={form.source}
                onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                placeholder="e.g. Sydney NSW"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                To (Destination) <span className="text-brand-orange">*</span>
              </label>
              <input
                required
                value={form.destination}
                onChange={(e) => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="e.g. Melbourne VIC"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
              />
            </div>
          </div>

          {/* Vehicle Type Dropdown & Cargo Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Vehicle Type <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={form.vehicle_type}
                  onChange={(e) => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer"
                >
                  <option value="" disabled>Select vehicle type</option>
                  {VEHICLE_TYPES.map(vt => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Cargo / Goods Type
              </label>
              <div className="relative">
                <select
                  value={form.cargo_type}
                  onChange={(e) => setForm(f => ({ ...f, cargo_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer"
                >
                  <option value="">Select cargo type (optional)</option>
                  {CARGO_TYPES.map(ct => (
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
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Weight (Tonnes)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.weight_tonnes}
                onChange={(e) => setForm(f => ({ ...f, weight_tonnes: e.target.value }))}
                placeholder="e.g. 22.5"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Price (AUD) <span className="text-brand-orange">*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-navy text-white rounded-lg font-bold text-sm hover:bg-brand-navy-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" />Saving...</> : editTrip ? 'Update Trip' : 'Post Trip'}
          </button>
        </form>
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

// ─── Applicants Panel ──────────────────────────────────────────────────────────
function ApplicantsPanel({ tripId, trip, authFetch, onDecision }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [rejectModalTarget, setRejectModalTarget] = useState(null); // { appId, driverName }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/trips/${tripId}/applicants`);
        const data = await res.json();
        setApplicants(data.applicants || []);
      } catch {
        setApplicants([]);
      } finally {
        setLoading(false);
      }
    };
    if (tripId) load();
  }, [tripId, authFetch]);

  const handleAccept = async (appId) => {
    setActionLoading(appId);
    setMsg({ type: '', text: '' });
    try {
      const res = await authFetch(`/applications/${appId}/accept`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ type: 'success', text: 'Driver accepted! Trip is now Assigned.' });
      // Refresh applicants
      const res2 = await authFetch(`/trips/${tripId}/applicants`);
      const data2 = await res2.json();
      setApplicants(data2.applicants || []);
      onDecision(); // refresh trips list
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
      // Refresh applicants
      const res2 = await authFetch(`/trips/${tripId}/applicants`);
      const data2 = await res2.json();
      setApplicants(data2.applicants || []);
      onDecision(); // refresh trips list
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="py-6 flex justify-center"><Loader2 size={22} className="animate-spin text-brand-orange" /></div>;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {msg.text && (
        <div className={`mb-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}
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
function OperatorTripCard({ trip, authFetch, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const NEXT_STATUS = { open: null, assigned: 'in_progress', in_progress: 'completed' };
  const NEXT_LABEL  = { assigned: 'Mark In Progress', in_progress: 'Mark Completed' };

  const handleStatusUpdate = async (newStatus) => {
    setStatusLoading(true);
    setStatusMsg('');
    try {
      const res = await authFetch(`/trips/${trip.id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg(`Status updated to ${newStatus.replace('_', ' ')}.`);
      onRefresh();
    } catch (err) {
      setStatusMsg(err.message || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
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

  const nextStatus = NEXT_STATUS[trip.status];

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
              <DollarSign size={11} />
              {parseFloat(trip.price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {trip.applicant_count} applicant{trip.applicant_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {/* Advance status */}
        {nextStatus && (
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={statusLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-bold hover:bg-brand-navy-mid transition-colors disabled:opacity-60"
          >
            {statusLoading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
            {NEXT_LABEL[trip.status]}
          </button>
        )}

        {/* Applicants toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
        >
          <Users size={12} />
          {expanded ? 'Hide' : 'View'} Applicants
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
        {trip.status !== 'in_progress' && trip.status !== 'completed' && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>

      {statusMsg && <p className="text-xs text-green-600 mt-2">{statusMsg}</p>}

      {/* Applicants panel */}
      {expanded && (
        <ApplicantsPanel tripId={trip.id} trip={trip} authFetch={authFetch} onDecision={onRefresh} />
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

  const fetchMyTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/trips/my');
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to load your trips.');
    } finally {
      setLoading(false);
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
                onRefresh={fetchMyTrips}
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
