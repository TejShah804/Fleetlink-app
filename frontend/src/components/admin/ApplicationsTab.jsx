import { useState, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  Panel, TableWrap, Th, Td, RouteCell,
  SearchInput, SelectFilter, LoadingState, ErrorState, EmptyState, StatusBadge
} from './shared';
import { formatCurrency, formatDateTime } from './format';

const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected'];

export default function ApplicationsTab() {
  const { adminGet } = useAdminAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);

      const data = await adminGet(`/applications?${params.toString()}`);
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminGet, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const awarded = applications.filter((a) => a.application_status === 'accepted');

  return (
    <div className="space-y-4">
      <Panel
        title="Driver Applications"
        subtitle={`${applications.length} applications · ${awarded.length} awarded transports`}
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search driver, reference, route..." />
            <SelectFilter
              value={status}
              onChange={setStatus}
              allLabel="All results"
              options={APPLICATION_STATUSES}
            />
          </div>
        }
      >
        {loading ? (
          <LoadingState label="Loading applications..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : applications.length === 0 ? (
          <EmptyState label="No applications match these filters." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Driver</Th>
                <Th>Transport</Th>
                <Th>Route</Th>
                <Th>Transport Owner</Th>
                <Th>Price</Th>
                <Th>Result</Th>
                <Th>Transport Status</Th>
                <Th>Applied</Th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.application_id} className="hover:bg-gray-50">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-brand-orange/10 shrink-0">
                        <Send size={13} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy truncate">{application.driver_name}</p>
                        <p className="text-xs text-gray-500 truncate">{application.driver_phone}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-semibold text-brand-navy whitespace-nowrap">
                    {application.load_reference}
                  </Td>
                  <Td><RouteCell source={application.source} destination={application.destination} /></Td>
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
                        <p className="text-xs text-red-500 max-w-[200px]">
                          {application.rejection_reason}
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td><StatusBadge status={application.trip_status} /></Td>
                  <Td className="text-gray-500 whitespace-nowrap">
                    {formatDateTime(application.applied_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
