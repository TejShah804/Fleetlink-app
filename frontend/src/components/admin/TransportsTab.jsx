import { useState, useEffect, useCallback } from 'react';
import { Truck, ChevronRight, Save } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Panel, TableWrap, Th, Td, RouteCell,
  SearchInput, SelectFilter, LoadingState, ErrorState, EmptyState, Drawer,
  DetailList, StatusBadge
} from './shared';
import { formatCurrency, formatDate } from './format';

const TRIP_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

export default function TransportsTab() {
  const { adminGet, adminFetch } = useAdminAuth();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (vehicleType.trim()) params.set('vehicle_type', vehicleType.trim());

      const data = await adminGet(`/trips?${params.toString()}`);
      setTrips(data.trips || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminGet, search, status, vehicleType]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = useCallback(async (trip) => {
    setSelected(trip);
    setDetail(null);
    setActionError('');
    setDetailLoading(true);
    try {
      const data = await adminGet(`/trips/${trip.id}`);
      setDetail(data);
    } catch (err) {
      setError(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, [adminGet]);

  /**
   * Admin moderation: override a transport's status
   */
  const changeStatus = async (newStatus) => {
    if (!detail) return;
    setSaving(true);
    setActionError('');
    try {
      const res = await adminFetch(`/trips/${detail.trip.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not update the transport status.');

      setDetail({ trip: data.trip, applicants: data.applicants });
      setSelected(data.trip);
      // Keep the table row in sync without a full reload
      setTrips((current) =>
        current.map((trip) => (trip.id === data.trip.id ? { ...trip, status: data.trip.status } : trip))
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalValue = trips.reduce((sum, trip) => sum + Number(trip.price || 0), 0);

  return (
    <div className="space-y-4">
      <Panel
        title="Transports"
        subtitle={`${trips.length} transports · ${formatCurrency(totalValue)} total value`}
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reference, route, owner..."
            />
            <SelectFilter
              value={status}
              onChange={setStatus}
              allLabel="All statuses"
              options={TRIP_STATUSES}
            />
            <input
              type="text"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              placeholder="Vehicle type"
              className="w-full sm:w-44 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400"
            />
          </div>
        }
      >
        {loading ? (
          <LoadingState label="Loading transports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : trips.length === 0 ? (
          <EmptyState label="No transports match these filters." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Route</Th>
                <Th>Vehicle</Th>
                <Th>Price</Th>
                <Th>Transport Owner</Th>
                <Th>Applicants</Th>
                <Th>Status</Th>
                <Th>Posted</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  onClick={() => openDetail(trip)}
                  className="hover:bg-brand-sand/40 cursor-pointer"
                >
                  <Td className="font-semibold text-brand-navy whitespace-nowrap">
                    {trip.load_reference}
                  </Td>
                  <Td><RouteCell source={trip.source} destination={trip.destination} /></Td>
                  <Td className="text-gray-600">{trip.vehicle_type}</Td>
                  <Td className="font-semibold text-brand-navy whitespace-nowrap">
                    {formatCurrency(trip.price)}
                  </Td>
                  <Td className="text-gray-600">
                    {trip.operator_company || trip.operator_name}
                  </Td>
                  <Td>
                    <span className="font-bold text-brand-navy">{trip.applicant_count}</span>
                    {trip.accepted_count > 0 && (
                      <span className="ml-1.5 text-xs font-semibold text-green-600">
                        ({trip.accepted_count} won)
                      </span>
                    )}
                  </Td>
                  <Td><StatusBadge status={trip.status} /></Td>
                  <Td className="text-gray-500 whitespace-nowrap">{formatDate(trip.created_at)}</Td>
                  <Td>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {/* ── Transport detail drawer ── */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={detail?.trip?.load_reference || selected?.load_reference || ''}
        subtitle={detail ? `${detail.trip.source} → ${detail.trip.destination}` : ''}
      >
        {detailLoading ? (
          <LoadingState label="Loading transport..." />
        ) : detail ? (
          <>
            <Panel title="Transport Details">
              <DetailList
                items={[
                  { label: 'Reference', value: detail.trip.load_reference },
                  { label: 'Status', value: <StatusBadge status={detail.trip.status} /> },
                  { label: 'Source', value: detail.trip.source },
                  { label: 'Destination', value: detail.trip.destination },
                  { label: 'Vehicle type', value: detail.trip.vehicle_type },
                  { label: 'Cargo type', value: detail.trip.cargo_type || '—' },
                  { label: 'Weight', value: detail.trip.weight_tonnes ? `${detail.trip.weight_tonnes} tonnes` : '—' },
                  { label: 'Price', value: formatCurrency(detail.trip.price) },
                  { label: 'Posted', value: formatDate(detail.trip.created_at) },
                ]}
              />
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                <p><span className="font-semibold text-brand-navy">Transport owner: </span>{detail.trip.operator_name}</p>
                {detail.trip.operator_company && (
                  <p className="mt-0.5"><span className="font-semibold text-brand-navy">Company: </span>{detail.trip.operator_company}</p>
                )}
                <p className="mt-0.5"><span className="font-semibold text-brand-navy">Contact: </span>{detail.trip.operator_phone} · {detail.trip.operator_email}</p>
              </div>
            </Panel>

            <Panel
              title="Moderation"
              subtitle="Override this transport's status as administrator"
              action={<Truck size={16} className="text-gray-400" />}
            >
              {actionError && (
                <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {actionError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {TRIP_STATUSES.map((option) => (
                  <button
                    key={option}
                    onClick={() => changeStatus(option)}
                    disabled={saving || detail.trip.status === option}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:cursor-not-allowed ${
                      detail.trip.status === option
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-brand-orange hover:text-brand-orange'
                    } ${saving ? 'opacity-60' : ''}`}
                  >
                    {saving && detail.trip.status !== option ? (
                      <Save size={11} className="inline mr-1" />
                    ) : null}
                    {option.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Status changes are recorded immediately. The transport owner sees the update on their dashboard.
              </p>
            </Panel>

            <Panel
              title="Applicants"
              subtitle={`${detail.applicants.length} owner drivers applied for this transport`}
            >
              {detail.applicants.length === 0 ? (
                <EmptyState label="No driver has applied to this transport yet." />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Driver</Th>
                      <Th>Contact</Th>
                      <Th>Result</Th>
                      <Th>Applied</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.applicants.map((applicant) => (
                      <tr key={applicant.application_id} className="hover:bg-gray-50">
                        <Td>
                          <p className="font-semibold text-brand-navy">{applicant.driver_name}</p>
                          {applicant.driver_company && (
                            <p className="text-xs text-gray-500">{applicant.driver_company}</p>
                          )}
                        </Td>
                        <Td className="text-gray-600 text-xs">
                          <p>{applicant.driver_email}</p>
                          <p>{applicant.driver_phone}</p>
                        </Td>
                        <Td>
                          <div className="space-y-1">
                            <StatusBadge status={applicant.application_status} />
                            {applicant.rejection_reason && (
                              <p className="text-xs text-red-500 max-w-[220px]">
                                {applicant.rejection_reason}
                              </p>
                            )}
                          </div>
                        </Td>
                        <Td className="text-gray-500 whitespace-nowrap">
                          {formatDate(applicant.applied_at)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </Panel>
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
