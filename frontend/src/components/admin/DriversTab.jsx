import { useState, useEffect, useCallback } from 'react';
import { UserCheck, ChevronRight, MapPin, Route as RouteIcon } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Panel, TableWrap, Th, Td, RouteCell,
  SearchInput, SelectFilter, LoadingState, ErrorState, EmptyState, Drawer,
  DetailList, StatusBadge
} from './shared';
import { formatCurrency, formatDate, formatDateTime } from './format';

export default function DriversTab() {
  const { adminGet } = useAdminAuth();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('applications');

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

      const data = await adminGet(`/drivers?${params.toString()}`);
      setDrivers(data.drivers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminGet, search, sort]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = useCallback(async (driver) => {
    setSelected(driver);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await adminGet(`/drivers/${driver.id}`);
      setDetail(data);
    } catch (err) {
      setError(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, [adminGet]);

  const totalApplications = drivers.reduce((sum, driver) => sum + driver.application_count, 0);
  const totalAwarded = drivers.reduce((sum, driver) => sum + driver.accepted_count, 0);

  return (
    <div className="space-y-4">
      <Panel
        title="Owner Drivers"
        subtitle={`${drivers.length} drivers · ${totalApplications} applications submitted · ${totalAwarded} transports awarded`}
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, company..." />
            <SelectFilter
              value={sort}
              onChange={setSort}
              allLabel="Sort: Applications"
              options={['applications', 'accepted', 'routes', 'earnings', 'newest', 'name']}
            />
          </div>
        }
      >
        {loading ? (
          <LoadingState label="Loading owner drivers..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : drivers.length === 0 ? (
          <EmptyState label="No owner drivers found." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Driver</Th>
                <Th>Contact</Th>
                <Th>Applied</Th>
                <Th>Pending</Th>
                <Th>Accepted</Th>
                <Th>Rejected</Th>
                <Th>Routes Travelled</Th>
                <Th>Earned Value</Th>
                <Th>Joined</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  onClick={() => openDetail(driver)}
                  className="hover:bg-brand-sand/40 cursor-pointer"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-brand-orange/10 shrink-0">
                        <UserCheck size={14} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy truncate">{driver.name}</p>
                        <p className="text-xs text-gray-500 truncate">{driver.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-600 whitespace-nowrap">{driver.phone_number || '—'}</Td>
                  <Td>
                    <span className="font-bold text-brand-navy text-base">{driver.application_count}</span>
                  </Td>
                  <Td>
                    <span className={`font-semibold ${driver.pending_count > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {driver.pending_count}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-green-600">{driver.accepted_count}</span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-red-500">{driver.rejected_count}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-brand-navy">
                      <RouteIcon size={13} className="text-brand-orange" />
                      {driver.routes_travelled}
                    </span>
                  </Td>
                  <Td className="font-semibold text-brand-navy whitespace-nowrap">
                    {formatCurrency(driver.earned_value)}
                  </Td>
                  <Td className="text-gray-500 whitespace-nowrap">{formatDate(driver.created_at)}</Td>
                  <Td>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {/* ── Driver detail drawer ── */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        subtitle={selected?.email}
      >
        {detailLoading ? (
          <LoadingState label="Loading driver profile..." />
        ) : detail ? (
          <>
            <Panel title="Account">
              <DetailList
                items={[
                  { label: 'Name', value: detail.driver.name },
                  { label: 'Company', value: detail.driver.company_name || '—' },
                  { label: 'Email', value: detail.driver.email },
                  { label: 'Phone', value: detail.driver.phone_number },
                  { label: 'Joined', value: formatDate(detail.driver.created_at) },
                  { label: 'Applications', value: detail.applications.length },
                ]}
              />
              {detail.driver.message && (
                <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="font-semibold text-brand-navy">Note: </span>
                  {detail.driver.message}
                </p>
              )}
            </Panel>

            <Panel
              title="Routes Travelled"
              subtitle="Lanes this driver has actually been awarded"
              action={<MapPin size={16} className="text-gray-400" />}
            >
              {detail.routes.length === 0 ? (
                <EmptyState label="This driver has not been awarded any transport yet." />
              ) : (
                <div className="space-y-2">
                  {detail.routes.map((route, index) => (
                    <div
                      key={`${route.source}-${route.destination}-${index}`}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0"
                    >
                      <RouteCell source={route.source} destination={route.destination} />
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-brand-navy">
                          {route.times_travelled}× 
                        </p>
                        <p className="text-xs text-gray-500">{formatCurrency(route.total_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="All Applications"
              subtitle="Every transport this driver applied for"
            >
              {detail.applications.length === 0 ? (
                <EmptyState label="This driver has not applied for any transport." />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Reference</Th>
                      <Th>Route</Th>
                      <Th>Transport Owner</Th>
                      <Th>Price</Th>
                      <Th>Result</Th>
                      <Th>Applied</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.applications.map((application) => (
                      <tr key={application.application_id} className="hover:bg-gray-50">
                        <Td className="font-semibold text-brand-navy whitespace-nowrap">
                          {application.load_reference}
                        </Td>
                        <Td>
                          <RouteCell source={application.source} destination={application.destination} />
                        </Td>
                        <Td className="text-gray-600">
                          {application.operator_company || application.operator_name}
                        </Td>
                        <Td className="font-semibold text-brand-navy whitespace-nowrap">
                          {formatCurrency(application.price)}
                        </Td>
                        <Td>
                          <div className="space-y-1">
                            <StatusBadge status={application.application_status} />
                            {application.rejection_reason && (
                              <p className="text-xs text-red-500 max-w-[220px]">
                                {application.rejection_reason}
                              </p>
                            )}
                          </div>
                        </Td>
                        <Td className="text-gray-500 whitespace-nowrap">
                          {formatDateTime(application.applied_at)}
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
