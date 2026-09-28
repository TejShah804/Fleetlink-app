import {
  Truck, CheckCircle, XCircle, Clock, Package, Loader2, Inbox, X, Shield
} from 'lucide-react';

// ─── Status Badges ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  open:        'bg-blue-100 text-blue-700 border-blue-200',
  assigned:    'bg-purple-100 text-purple-700 border-purple-200',
  in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
  completed:   'bg-green-100 text-green-700 border-green-200',
  cancelled:   'bg-gray-100 text-gray-500 border-gray-200',
  pending:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted:    'bg-green-100 text-green-700 border-green-200',
  rejected:    'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS = {
  open:        Truck,
  assigned:    CheckCircle,
  in_progress: Truck,
  completed:   CheckCircle,
  cancelled:   XCircle,
  pending:     Clock,
  accepted:    CheckCircle,
  rejected:    XCircle,
};

export function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || Package;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      <Icon size={11} />
      {String(status || '').replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, accent = 'navy' }) {
  const accents = {
    navy:   'bg-brand-navy/10 text-brand-navy',
    orange: 'bg-brand-orange/10 text-brand-orange',
    green:  'bg-green-100 text-green-700',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    gray:   'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg shrink-0 ${accents[accent] || accents.navy}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-brand-navy mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Panel (section wrapper) ───────────────────────────────────────────────────
export function Panel({ title, subtitle, action, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div>
            {title && <h2 className="text-sm font-bold text-brand-navy">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

// ─── Table Shell ───────────────────────────────────────────────────────────────
export function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-3 py-2.5 border-b border-gray-200 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-3 py-2.5 border-b border-gray-100 text-gray-700 align-middle ${className}`}>
      {children}
    </td>
  );
}

// ─── Route Cell (source → destination) ─────────────────────────────────────────
export function RouteCell({ source, destination }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700 whitespace-nowrap">
      <span className="font-medium">{source || '—'}</span>
      <span className="text-brand-orange">→</span>
      <span className="font-medium">{destination || '—'}</span>
    </span>
  );
}

// ─── Search Input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400"
    />
  );
}

// ─── Select Filter ─────────────────────────────────────────────────────────────
export function SelectFilter({ value, onChange, options, allLabel = 'All' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {String(option).replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}

// ─── Loading / Empty / Error States ────────────────────────────────────────────
export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 size={28} className="animate-spin text-brand-orange" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export function EmptyState({ label = 'Nothing to show yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="p-3 rounded-full bg-gray-100">
        <Inbox size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="p-3 rounded-full bg-red-50">
        <XCircle size={22} className="text-red-500" />
      </div>
      <p className="text-sm text-red-600 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-brand-orange hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Detail Modal (centered pop-up) ────────────────────────────────────────────
export function Drawer({ open, onClose, title, subtitle, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <Shield size={18} className="text-brand-orange shrink-0" />
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Key/Value List ────────────────────────────────────────────────────────────
export function DetailList({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</dt>
          <dd className="text-sm text-brand-navy font-medium mt-0.5 break-words">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
