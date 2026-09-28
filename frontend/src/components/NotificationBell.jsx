// Notification bell: a bell button with an unread badge and a dropdown, plus
// the 30-second poll that keeps the badge current.
//
// Polling rather than Socket.io is a deliberate constraint for this project —
// no persistent connection to maintain, and the bell only needs to be roughly
// current. 30s is short enough that a driver does not miss an approval.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const { authFetch } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await authFetch('/notifications');
      const data = await res.json();
      if (!res.ok) return;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // A failed poll is not worth surfacing — the next one in 30s retries,
      // and a driver cannot act on a bell they cannot read.
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authFetch]);

  // Initial load, then poll. The interval is cleared on unmount so navigating
  // away does not leave a timer running.
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(() => fetchNotifications({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close on outside click, so the dropdown behaves like a real menu
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const markAllRead = async () => {
    // Optimistic: the badge should clear immediately, and the next poll
    // reconciles whatever the server actually changed.
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await authFetch('/notifications/read-all', { method: 'PUT' });
    } catch {
      fetchNotifications({ silent: true });
    }
  };

  const markRead = async (id) => {
    try {
      await authFetch(`/notifications/${id}/read`, { method: 'PUT' });
    } finally {
      fetchNotifications({ silent: true });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
        className="relative p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 sticky top-0 bg-white">
            <p className="text-xs font-bold text-brand-navy uppercase tracking-wide">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-brand-orange font-semibold hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={18} className="animate-spin text-brand-orange" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${n.is_read ? '' : 'bg-brand-orange/[0.05]'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-orange shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-relaxed ${n.is_read ? 'text-gray-500' : 'font-semibold text-brand-navy'}`}>
                          {n.message}
                        </p>
                        {n.load_reference && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            #{n.load_reference}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
