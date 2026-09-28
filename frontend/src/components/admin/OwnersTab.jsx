import { useState, useEffect, useCallback } from 'react';
import { Building2, ChevronRight, MapPin } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Panel, TableWrap, Th, Td, RouteCell,
  SearchInput, SelectFilter, LoadingState, ErrorState, EmptyState, Drawer,
  DetailList, StatusBadge
} from './shared';
import { formatCurrency, formatDate } from './format';

export default function OwnersTab() {
  const { adminGet } = useAdminAuth();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('transports');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (sort) params.set('sort', sort);

      const data = await adminGet(`/operators?${params.toString()}`);
      setOwners(data.operators || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminGet, search, sort]);

  // Debounce so typing in the search box does not fire a request per keystroke
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = useCallback(async (owner) => {
    setSelected(owner);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await adminGet(`/operators/${owner.id}`);
      setDetail(data);
    } catch (err) {
      setError(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, [adminGet]);

  const totalTransports = owners.reduce((sum, owner) => sum + owner.transport_count, 0);
  const totalValue = owners.reduce((sum, owner) => sum + owner.total_value, 0);

  return (
    <div className="space-y-4">
      <Panel
        title="Transport Owners"
        subtitle={`${owners.length} fleet operators · ${totalTransports} transports given · ${formatCurrency(totalValue)} total value`}
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, company..." />
            <SelectFilter
              value={sort}
              onChange={setSort}
              allLabel="Sort: Transports"
              options={['transports', 'value', 'applications', 'newest', 'name']}
            />
          </div>
        }
      >
        {loading ? (
          <LoadingState label="Loading transport owners..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : owners.length === 0 ? (
          <EmptyState label="No transport owners found." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Owner</Th>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>Transports</Th>
                <Th>Breakdown</Th>
                <Th>Applications</Th>
                <Th>Total Value</Th>
                <Th>Joined</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr
                  key={owner.id}
                  onClick={() => openDetail(owner)}
                  className="hover:bg-brand-sand/40 cursor-pointer"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-brand-navy/10 shrink-0">
                        <Building2 size={14} className="text-brand-navy" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy truncate">{owner.name}</p>
                        <p className="text-xs text-gray-500 truncate">{owner.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-600">{owner.company_name || '—'}</Td>
                  <Td className="text-gray-600 whitespace-nowrap">{owner.phone_number || '—'}</Td>
                  <Td>
                    <span className="font-bold text-brand-navy text-base">{owner.transport_count}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {owner.open_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                          {owner.open_count} open
                        </span>
                      )}
                      {owner.assigned_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-semibold">
                          {owner.assigned_count} assigned
                        </span>
                      )}
                      {owner.in_progress_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-xs font-semibold">
                          {owner.in_progress_count} active
                        </span>
                      )}
                      {owner.completed_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-xs font-semibold">
                          {owner.completed_count} done
                        </span>
                      )}
                      {owner.cancelled_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-semibold">
                          {owner.cancelled_count} cancelled
                        </span>
                      )}
                      {owner.transport_count === 0 && (
                        <span className="text-xs text-gray-400">No transports yet</span>
                      )}
                    </div>
                  </Td>
                  <Td className="font-semibold text-brand-navy">{owner.total_applications}</Td>
                  <Td className="font-semibold text-brand-navy whitespace-nowrap">
                    {formatCurrency(owner.total_value)}
                  </Td>
                  <Td className="text-gray-500 whitespace-nowrap">{formatDate(owner.created_at)}</Td>
                  <Td>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {/* ── Owner detail drawer ── */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        subtitle={selected?.company_name || selected?.email}
      >
        {detailLoading ? (
          <LoadingState label="Loading owner profile..." />
        ) : detail ? (
          <>
            <Panel title="Account">
              <DetailList
                items={[
                  { label: 'Name', value: detail.operator.name },
                  { label: 'Company', value: detail.operator.company_name || '—' },
                  { label: 'Email', value: detail.operator.email },
                  { label: 'Phone', value: detail.operator.phone_number },
                  { label: 'Joined', value: formatDate(detail.operator.created_at) },
                  { label: 'Transports', value: detail.transports.length },
                ]}
              />
              {detail.operator.message && (
                <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="font-semibold text-brand-navy">Note: </span>
                  {detail.operator.message}
                </p>
              )}
            </Panel>

            <Panel
              title="Most Requested Lanes"
              subtitle="Where this owner sends transports"
              action={<MapPin size={16} className="text-gray-400" />}
            >
              {detail.top_routes.length === 0 ? (
                <EmptyState label="No transports posted yet." />
              ) : (
                <div className="space-y-2">
                  {detail.top_routes.map((route, index) => (
                    <div
                      key={`${route.source}-${route.destination}-${index}`}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0"
                    >
                      <RouteCell source={route.source} destination={route.destination} />
                      <span className="text-sm font-bold text-brand-navy shrink-0">
                        {route.trip_count} transport{route.trip_count === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="All Transports" subtitle={`${detail.transports.length} posted by this owner`}>
              {detail.transports.length === 0 ? (
                <EmptyState label="This owner has not posted any transports." />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Route</Th>
                      <Th>Vehicle</Th>
                      <Th>Price</Th>
                      <Th>Applicants</Th>
                      <Th>Status</Th>
                      <Th>Posted</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.transports.map((trip) => (
                      <tr key={trip.id} className="hover:bg-gray-50">
                        <Td className="font-semibold text-brand-navy whitespace-nowrap">
                          {trip.load_reference}
                        </Td>
                        <Td><RouteCell source={trip.source} destination={trip.destination} /></Td>
                        <Td className="text-gray-600">{trip.vehicle_type}</Td>
                        <Td className="font-semibold text-brand-navy whitespace-nowrap">
                          {formatCurrency(trip.price)}
                        </Td>
                        <Td className="font-semibold text-brand-navy">{trip.applicant_count}</Td>
                        <Td><StatusBadge status={trip.status} /></Td>
                        <Td className="text-gray-500 whitespace-nowrap">{formatDate(trip.created_at)}</Td>
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
