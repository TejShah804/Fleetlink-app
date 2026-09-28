import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Building2, UserCheck, Truck, Send,
  LogOut, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import OverviewTab from '@/components/admin/OverviewTab';
import OwnersTab from '@/components/admin/OwnersTab';
import DriversTab from '@/components/admin/DriversTab';
import TransportsTab from '@/components/admin/TransportsTab';
import ApplicationsTab from '@/components/admin/ApplicationsTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'owners', label: 'Transport Owners', icon: Building2 },
  { key: 'drivers', label: 'Owner Drivers', icon: UserCheck },
  { key: 'transports', label: 'Transports', icon: Truck },
  { key: 'applications', label: 'Applications', icon: Send },
];

export default function AdminDashboard() {
  const { admin, logout, adminGet } = useAdminAuth();

  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    return adminGet('/overview');
  }, [adminGet]);

  // On mount. The `active` flag drops the response if the panel unmounts mid-request.
  useEffect(() => {
    let active = true;

    fetchOverview()
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [fetchOverview]);

  // Manual refresh (header button + retry) — shows the spinner around the fetch
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOverview();
      setOverview(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchOverview]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 h-screen sticky top-0 bg-brand-navy text-white flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-orange">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">FleetLink Admin</p>
              <p className="text-xs text-white/50 truncate">{admin?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ${
                tab === key
                  ? 'bg-brand-orange text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/70 hover:bg-red-500/20 hover:text-white transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">
              {TABS.find((t) => t.key === tab)?.label}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Signed in as {admin?.name} · administrator
            </p>
          </div>

          <button
            onClick={loadOverview}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:border-brand-orange hover:text-brand-orange transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        <main className="flex-1 p-6">
          {tab === 'overview' && (
            <OverviewTab
              data={overview}
              loading={loading}
              error={error}
              onRetry={loadOverview}
            />
          )}
          {tab === 'owners' && <OwnersTab />}
          {tab === 'drivers' && <DriversTab />}
          {tab === 'transports' && <TransportsTab />}
          {tab === 'applications' && <ApplicationsTab />}
        </main>
      </div>
    </div>
  );
}
