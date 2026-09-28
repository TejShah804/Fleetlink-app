import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AdminAuthContext = createContext(null);

// Admin panel talks to the dedicated admin API on port 5001, not the public API on 5000
const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5001/api/admin';

// Deliberately separate storage keys from AuthContext so signing in to the admin
// panel never overwrites a driver/operator session (and vice versa)
const TOKEN_KEY = 'fleetlink_admin_token';
const USER_KEY = 'fleetlink_admin_user';

/**
 * Read the saved admin out of localStorage.
 * Used as a lazy useState initializer so the session is restored during the first
 * render, rather than in an effect that would cause a second render pass.
 */
function readSavedAdmin() {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  const savedUser = localStorage.getItem(USER_KEY);

  if (!savedToken || !savedUser) return { token: null, admin: null };

  try {
    return { token: savedToken, admin: JSON.parse(savedUser) };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, admin: null };
  }
}

export function AdminAuthProvider({ children }) {
  const [saved] = useState(readSavedAdmin);

  const [admin, setAdmin] = useState(saved.admin);
  const [token, setToken] = useState(saved.token);
  const [loading] = useState(false);

  /**
   * Sign in against the admin API → saves token & admin in localStorage
   */
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${ADMIN_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || 'Admin login failed.');
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);

    return data.admin;
  }, []);

  /**
   * Clear the admin session
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  /**
   * Authenticated fetch against the admin API.
   * Any 401/403 means the session is no longer valid, so it is cleared.
   */
  const adminFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${ADMIN_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (res.status === 401 || res.status === 403) {
      const data = await res.json().catch(() => ({}));
      logout();
      throw new Error(data.message || 'Your admin session has ended. Please sign in again.');
    }

    return res;
  }, [token, logout]);

  /**
   * Convenience wrapper that parses the JSON body and surfaces API error messages
   */
  const adminGet = useCallback(async (path) => {
    const res = await adminFetch(path);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed.');
    return data;
  }, [adminFetch]);

  const value = useMemo(() => ({
    admin,
    token,
    loading,
    login,
    logout,
    adminFetch,
    adminGet,
    isAdmin: admin?.role === 'admin'
  }), [admin, token, loading, login, logout, adminFetch, adminGet]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}
