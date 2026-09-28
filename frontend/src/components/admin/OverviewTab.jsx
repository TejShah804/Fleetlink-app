import {
  Truck, Users, UserCheck, Send, DollarSign, TrendingUp,
  CheckCircle, Clock, XCircle, Building2, Award, Inbox, Flame
} from 'lucide-react';
import {
  StatCard, Panel, RouteCell,
  LoadingState, ErrorState, EmptyState
} from './shared';
import { formatCurrency, formatDate } from './format';

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) {
    return <EmptyState label="No transport or application history yet." />;
  }

  const max = Math.max(...trend.map((m) => Math.max(m.trips, m.applications)), 1);

  return (
    <div className="space-y-3">
      {trend.map((month) => (
        <div key={month.month} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">{month.month}</span>
            <span className="text-gray-500">
              {month.trips} transports · {month.applications} applications
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-navy rounded-full transition-all"
                style={{ width: `${(month.trips / max) * 100}%` }}
              />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-orange rounded-full transition-all"
                style={{ width: `${(month.applications / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-brand-navy rounded-sm" /> Transports
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-brand-orange rounded-sm" /> Applications
        </span>
      </div>
    </div>
  );
}

function StatusBreakdown({ trips }) {
  const rows = [
    { key: 'open_trips', label: 'Open', icon: Truck, color: 'bg-blue-500' },
    { key: 'assigned_trips', label: 'Assigned', icon: CheckCircle, color: 'bg-purple-500' },
    { key: 'in_progress_trips', label: 'In progress', icon: Clock, color: 'bg-brand-orange' },
    { key: 'completed_trips', label: 'Completed', icon: CheckCircle, color: 'bg-green-500' },
    { key: 'cancelled_trips', label: 'Cancelled', icon: XCircle, color: 'bg-gray-400' },
  ];

  const max = Math.max(...rows.map((r) => trips[r.key] || 0), 1);

  return (
    <div className="space-y-2.5">
      {rows.map(({ key, label, icon: Icon, color }) => {
        const value = trips[key] || 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <Icon size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs font-medium text-gray-600 w-24 shrink-0">{label}</span>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-brand-navy w-8 text-right shrink-0">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OverviewTab({ data, loading, error, onRetry }) {
  if (loading) return <LoadingState label="Loading platform overview..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data) return null;

  const { users, trips, applications, activity, top_routes, top_operators, top_drivers, monthly_trend } = data;

  const acceptanceRate = applications.total_applications
    ? Math.round((applications.accepted_applications / applications.total_applications) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* ── Headline counters ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          icon={Truck}
          label="Transports"
          value={trips.total_trips}
          sub={`${trips.open_trips} open now`}
          accent="navy"
        />
        <StatCard
          icon={DollarSign}
          label="Transport Value"
          value={formatCurrency(trips.total_transport_value)}
          sub={`${formatCurrency(trips.completed_value)} completed`}
          accent="orange"
        />
        <StatCard
          icon={UserCheck}
          label="Owner Drivers"
          value={users.owner_drivers}
          sub={`${activity.new_users_7d} new this week`}
          accent="blue"
        />
        <StatCard
          icon={Building2}
          label="Transport Owners"
          value={users.operators}
          sub={`${users.leads} leads captured`}
          accent="purple"
        />
        <StatCard
          icon={Send}
          label="Applications"
          value={applications.total_applications}
          sub={`${applications.pending_applications} awaiting decision`}
          accent="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Acceptance Rate"
          value={`${acceptanceRate}%`}
          sub={`${applications.accepted_applications} transports awarded`}
          accent="orange"
        />
      </div>

      {/* ── Breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Transport Status" subtitle="Where every transport stands">
          <StatusBreakdown trips={trips} />
        </Panel>

        <Panel title="Last 6 Months" subtitle="Transports vs driver applications">
          <TrendChart trend={monthly_trend} />
        </Panel>

        <Panel title="Activity" subtitle="Platform velocity">
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'New accounts (7d)', value: activity.new_users_7d },
              { label: 'New accounts (30d)', value: activity.new_users_30d },
              { label: 'New transports (7d)', value: activity.new_trips_7d },
              { label: 'New transports (30d)', value: activity.new_trips_30d },
              { label: 'New applications (7d)', value: activity.new_applications_7d },
              { label: 'New applications (30d)', value: activity.new_applications_30d },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-gray-600 text-xs">{row.label}</span>
                <span className="font-bold text-brand-navy">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-gray-100">
              <span className="text-gray-600 text-xs">Avg applications / transport</span>
              <span className="font-bold text-brand-navy">
                {Number(applications.avg_applications_per_trip).toFixed(2)}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Leaderboards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Top Transport Owners" subtitle="Ranked by transports given">
          {top_operators.length === 0 ? (
            <EmptyState label="No transport owners registered yet." />
          ) : (
            <ol className="space-y-2.5">
              {top_operators.map((owner, index) => (
                <li key={owner.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-navy truncate">{owner.name}</p>
                    <p className="text-xs text-gray-500 truncate">{owner.company_name || 'No company'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-brand-navy">{owner.transport_count}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(owner.total_value)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Top Owner Drivers" subtitle="Ranked by transports awarded">
          {top_drivers.length === 0 ? (
            <EmptyState label="No owner drivers registered yet." />
          ) : (
            <ol className="space-y-2.5">
              {top_drivers.map((driver, index) => (
                <li key={driver.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-navy truncate">{driver.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {driver.application_count} applied · {driver.accepted_count} awarded
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-brand-navy">{driver.accepted_count}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(driver.earned_value)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title="Route Hotspots"
          subtitle="Corridors carrying the heaviest freight"
          action={<Flame size={16} className="text-brand-orange" />}
        >
          {top_routes.length === 0 ? (
            <EmptyState label="No transports posted yet." />
          ) : (
            <ol className="space-y-2">
              {top_routes.slice(0, 6).map((route, index) => (
                <li key={`${route.source}-${route.destination}-${index}`} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RouteCell source={route.source} destination={route.destination} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-brand-navy">{route.trip_count}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(route.total_value)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* ── Recent signups ── */}
      <Panel
        title="Platform Totals"
        subtitle="Registered accounts by role"
        action={<Inbox size={16} className="text-gray-400" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'All accounts', value: users.total_users, icon: Users, accent: 'text-brand-navy' },
            { label: 'Owner drivers', value: users.owner_drivers, icon: UserCheck, accent: 'text-blue-600' },
            { label: 'Transport owners', value: users.operators, icon: Building2, accent: 'text-purple-600' },
            { label: 'Leads', value: users.leads, icon: Send, accent: 'text-gray-500' },
            { label: 'Admins', value: users.admins, icon: Award, accent: 'text-brand-orange' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <item.icon size={16} className={item.accent} />
              <div>
                <p className="text-lg font-bold text-brand-navy leading-none">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Snapshot generated {formatDate(data.generated_at)}
        </p>
      </Panel>
    </div>
  );
}
