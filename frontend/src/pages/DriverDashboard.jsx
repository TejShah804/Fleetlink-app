import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Truck, MapPin, DollarSign, Search, X, Loader2, CheckCircle,
  AlertCircle, Clock, XCircle, ChevronRight, LogOut, LayoutDashboard,
  FileText, RefreshCw, ChevronDown, Building2, Info, MessageSquare
} from 'lucide-react';
import { VEHICLE_TYPES } from './OperatorDashboard';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    pending:     'bg-yellow-100 text-yellow-700 border-yellow-200',
    accepted:    'bg-green-100 text-green-700 border-green-200',
    rejected:    'bg-red-100 text-red-700 border-red-200',
    open:        'bg-blue-100 text-blue-700 border-blue-200',
    assigned:    'bg-purple-100 text-purple-700 border-purple-200',
    in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
    completed:   'bg-green-100 text-green-700 border-green-200',
    cancelled:   'bg-gray-100 text-gray-500 border-gray-200',
  };
  const icons = {
    pending:     <Clock size={12} />,
    accepted:    <CheckCircle size={12} />,
    rejected:    <XCircle size={12} />,
    open:        <Truck size={12} />,
    assigned:    <CheckCircle size={12} />,
    in_progress: <Truck size={12} />,
    completed:   <CheckCircle size={12} />,
    cancelled:   <XCircle size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {icons[status]}
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ─── Rejection Detail Modal ───────────────────────────────────────────────────
function RejectionDetailModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-navy">Application Feedback</h3>
            <p className="text-xs text-gray-400">Why your application was declined</p>
          </div>
        </div>

        {/* Trip & Company Info */}
        <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100 text-xs mb-4 space-y-1.5">
          {data.load_ref && (
            <p className="text-gray-500 font-mono font-bold">
              Load Reference: <span className="text-brand-navy">#{data.load_ref}</span>
            </p>
          )}
          <p className="text-gray-700 font-semibold">
            Route: {data.source} → {data.destination}
          </p>
          <p className="text-gray-600">
            Company: <span className="font-bold text-brand-navy">{data.company}</span>
            {data.operator && data.operator !== data.company && (
              <span className="text-gray-400"> (Operator: {data.operator})</span>
            )}
          </p>
        </div>

        {/* Message Content */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare size={13} className="text-brand-orange" />
            Reason from Operator:
          </label>
          <div className="p-3.5 rounded-lg bg-red-50/70 border border-red-200 text-sm text-red-900 leading-relaxed font-medium">
            &ldquo;{data.reason}&rdquo;
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-brand-navy text-white text-sm font-bold hover:bg-brand-navy-mid transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Trip Card ─────────────────────────────────────────────────────────────────
function TripCard({ trip, onApply, applying }) {
  const companyName = trip.operator_company || trip.operator_name;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
      <div>
        {/* Header with Load Reference Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {trip.load_reference ? (
            <span className="px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy font-mono text-[11px] font-bold tracking-wide">
              #{trip.load_reference}
            </span>
          ) : <span />}
          <div className="flex items-center gap-1 text-lg font-bold text-brand-navy">
            <DollarSign size={16} />
            {parseFloat(trip.price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Route */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1.5">
            <MapPin size={14} className="text-brand-orange shrink-0" />
            <span className="font-semibold text-brand-navy truncate">{trip.source}</span>
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
            <span className="font-semibold text-brand-navy truncate">{trip.destination}</span>
          </div>

          {/* Details (Vehicle, Cargo, Weight) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 font-medium text-brand-navy bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
              <Truck size={12} className="text-brand-orange" />
              {trip.vehicle_type}
            </span>
            {trip.cargo_type && (
              <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-gray-700">
                {trip.cargo_type}
              </span>
            )}
            {trip.weight_tonnes && (
              <span className="text-gray-600 text-xs font-medium">
                {trip.weight_tonnes}t
              </span>
            )}
          </div>
        </div>

        {/* Company / Operator Info */}
        <div className="text-xs mb-4 pt-2.5 border-t border-gray-100 flex items-start gap-2">
          <div className="p-1 rounded bg-brand-orange/10 text-brand-orange shrink-0 mt-0.5">
            <Building2 size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Posted by:</span>
              <span className="font-bold text-brand-navy truncate text-xs">
                {companyName}
              </span>
            </div>
            {/* {trip.operator_company && trip.operator_name && trip.operator_name !== trip.operator_company && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                Contact: <span className="text-gray-600 font-medium">{trip.operator_name}</span>
              </p>
            )} */}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => onApply(trip.id)}
        disabled={applying === trip.id}
        className="w-full py-2 rounded-lg bg-brand-navy text-white text-sm font-bold hover:bg-brand-navy-mid transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {applying === trip.id ? (
          <><Loader2 size={15} className="animate-spin" /> Applying...</>
        ) : (
          'Apply Now'
        )}
      </button>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user, logout, authFetch } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'applications'

  // Browse Trips
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState('');
  const [filters, setFilters] = useState({ source: '', destination: '', vehicle_type: '' });
  const [applying, setApplying] = useState(null); // trip_id being applied to
  const [applyMsg, setApplyMsg] = useState({ type: '', text: '' });

  // My Applications
  const [myApps, setMyApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');
  const [selectedRejection, setSelectedRejection] = useState(null);

  // Redirect if not driver
  useEffect(() => {
    if (user && user.role !== 'owner_driver') {
      window.location.href = user.role === 'fleet_operator' ? '/dashboard/operator' : '/';
    }
  }, [user]);

  const fetchOpenTrips = useCallback(async () => {
    setTripsLoading(true);
    setTripsError('');
    try {
      const params = new URLSearchParams();
      if (filters.source) params.append('source', filters.source);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type);

      const res = await fetch(`${API_BASE}/trips?${params.toString()}`);
      const data = await res.json();
      setTrips(data.trips || []);
    } catch {
      setTripsError('Failed to load trips. Please try again.');
    } finally {
      setTripsLoading(false);
    }
  }, [filters]);

  const fetchMyApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError('');
    try {
      const res = await authFetch('/applications/my');
      const data = await res.json();
      setMyApps(data.applications || []);
    } catch (err) {
      setAppsError(err.message || 'Failed to load applications.');
    } finally {
      setAppsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeTab === 'browse') fetchOpenTrips();
    if (activeTab === 'applications') fetchMyApplications();
  }, [activeTab, fetchOpenTrips, fetchMyApplications]);

  const handleApply = async (tripId) => {
    setApplying(tripId);
    setApplyMsg({ type: '', text: '' });
    try {
      const res = await authFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({ trip_id: tripId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setApplyMsg({ type: 'success', text: 'Application submitted successfully! The operator will review your profile.' });
      fetchOpenTrips(); // refresh
    } catch (err) {
      setApplyMsg({ type: 'error', text: err.message || 'Could not submit application.' });
    } finally {
      setApplying(null);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchOpenTrips();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-brand-navy shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
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

          {/* Title */}
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-brand-orange" />
            <h1 className="text-white font-bold text-base">Driver Dashboard</h1>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-semibold truncate max-w-[130px]">{user.name}</p>
              <p className="text-white/50 text-[10px]">Owner Driver</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-6 p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-xl shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Welcome back, {user.name}!</h2>
            <p className="text-sm text-gray-500">Browse available loads or check on your applications below.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'browse'
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Truck size={15} />
            Browse Trips
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'applications'
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={15} />
            My Applications
            {myApps.length > 0 && (
              <span className="bg-brand-orange text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {myApps.length > 9 ? '9+' : myApps.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Browse Trips Tab ── */}
        {activeTab === 'browse' && (
          <div>
            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Search size={12} /> Filter Trips
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Source city..."
                  value={filters.source}
                  onChange={(e) => setFilters(f => ({ ...f, source: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
                />
                <input
                  type="text"
                  placeholder="Destination city..."
                  value={filters.destination}
                  onChange={(e) => setFilters(f => ({ ...f, destination: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
                />
                <div className="relative">
                  <select
                    value={filters.vehicle_type}
                    onChange={(e) => setFilters(f => ({ ...f, vehicle_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none bg-white appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">All vehicle types</option>
                    {VEHICLE_TYPES.map(vt => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" className="px-4 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-mid transition-colors flex items-center gap-1.5">
                  <Search size={14} /> Search
                </button>
                {(filters.source || filters.destination || filters.vehicle_type) && (
                  <button
                    type="button"
                    onClick={() => { setFilters({ source: '', destination: '', vehicle_type: '' }); }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    <X size={14} /> Clear
                  </button>
                )}
                <button type="button" onClick={fetchOpenTrips} className="ml-auto p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
                  <RefreshCw size={15} />
                </button>
              </div>
            </form>

            {/* Apply feedback */}
            {applyMsg.text && (
              <div className={`mb-4 p-3 rounded-xl border flex items-start gap-2 text-sm ${
                applyMsg.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {applyMsg.type === 'success' ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <span>{applyMsg.text}</span>
              </div>
            )}

            {/* Trips Grid */}
            {tripsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
              </div>
            ) : tripsError ? (
              <div className="flex flex-col items-center py-16 text-center">
                <AlertCircle size={36} className="text-red-400 mb-2" />
                <p className="text-gray-600 text-sm">{tripsError}</p>
                <button onClick={fetchOpenTrips} className="mt-3 px-4 py-2 bg-brand-navy text-white text-sm rounded-lg">Retry</button>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Truck size={48} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">No open trips found</p>
                <p className="text-gray-400 text-sm mt-1">Try clearing your filters or check back later.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-semibold text-brand-navy">{trips.length}</span> open {trips.length === 1 ? 'trip' : 'trips'} available
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onApply={handleApply} applying={applying} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── My Applications Tab ── */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-brand-navy">Your Applications</h3>
              <button onClick={fetchMyApplications} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>

            {appsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
              </div>
            ) : appsError ? (
              <div className="flex flex-col items-center py-16 text-center">
                <AlertCircle size={36} className="text-red-400 mb-2" />
                <p className="text-gray-600 text-sm">{appsError}</p>
              </div>
            ) : myApps.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <FileText size={48} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">No applications yet</p>
                <p className="text-gray-400 text-sm mt-1">Browse trips and apply to get started!</p>
                <button onClick={() => setActiveTab('browse')} className="mt-4 px-5 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-mid transition-colors">Browse Trips</button>
              </div>
            ) : (
              <div className="space-y-3">
                {myApps.map((app) => (
                  <div key={app.application_id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Route */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {app.load_reference && (
                          <span className="px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy font-mono text-xs font-bold tracking-wide">
                            #{app.load_reference}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
                          <MapPin size={13} className="text-brand-orange shrink-0" />
                          <span className="truncate">{app.source}</span>
                          <ChevronRight size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate">{app.destination}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium text-brand-navy">
                          <Truck size={11} className="text-brand-orange" />
                          {app.vehicle_type}
                        </span>
                        {app.cargo_type && (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]">
                            {app.cargo_type}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-bold text-gray-700">
                          <DollarSign size={11} />
                          {parseFloat(app.price).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                        <Building2 size={13} className="text-brand-orange shrink-0" />
                        <span className="text-gray-400">Company:</span>
                        <span className="font-bold text-brand-navy">
                          {app.operator_company || app.operator_name}
                        </span>
                        {app.operator_company && app.operator_name && app.operator_name !== app.operator_company && (
                          <span className="text-gray-400 text-[11px]">(Operator: {app.operator_name})</span>
                        )}
                      </div>
                    </div>

                    {/* Statuses */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Application:</span>
                        {app.application_status === 'rejected' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRejection({
                              reason: app.rejection_reason || 'No specific reason provided by the operator.',
                              company: app.operator_company || app.operator_name,
                              operator: app.operator_name,
                              source: app.source,
                              destination: app.destination,
                              load_ref: app.load_reference,
                              applied_at: app.applied_at
                            })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 transition-all cursor-pointer group shadow-xs"
                            title="Click to view why this application was rejected"
                          >
                            <XCircle size={12} className="text-red-600" />
                            <span>REJECTED</span>
                            <span className="w-3.5 h-3.5 rounded-full bg-red-200 group-hover:bg-red-300 flex items-center justify-center text-[10px] font-black text-red-800 ml-0.5">
                              i
                            </span>
                          </button>
                        ) : (
                          <StatusBadge status={app.application_status} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Trip:</span>
                        <StatusBadge status={app.trip_status} />
                      </div>
                      {app.application_status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => setSelectedRejection({
                            reason: app.rejection_reason || 'No specific reason provided by the operator.',
                            company: app.operator_company || app.operator_name,
                            operator: app.operator_name,
                            source: app.source,
                            destination: app.destination,
                            load_ref: app.load_reference,
                            applied_at: app.applied_at
                          })}
                          className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Info size={11} />
                          View reason
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Rejection Detail Modal */}
      <RejectionDetailModal
        data={selectedRejection}
        onClose={() => setSelectedRejection(null)}
      />
    </div>
  );
}
