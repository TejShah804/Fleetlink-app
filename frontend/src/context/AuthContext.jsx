import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('fleetlink_token');
    const savedUser = localStorage.getItem('fleetlink_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('fleetlink_token');
        localStorage.removeItem('fleetlink_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Login with email + password → calls backend, saves token & user
   */
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem('fleetlink_token', data.token);
    localStorage.setItem('fleetlink_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    return data.user;
  };

  /**
   * Clear session
   */
  const logout = () => {
    localStorage.removeItem('fleetlink_token');
    localStorage.removeItem('fleetlink_user');
    setToken(null);
    setUser(null);
  };

  /**
   * Make an authenticated fetch to the API
   */
  const authFetch = async (path, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    // Auto-logout if token expired
    if (res.status === 401 || res.status === 403) {
      const data = await res.json();
      // Only logout on token errors, not role errors
      if (res.status === 401) {
        logout();
      }
      throw new Error(data.message || 'Unauthorized');
    }

    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        authFetch,
        isDriver: user?.role === 'owner_driver',
        isOperator: user?.role === 'fleet_operator',
        isLoggedIn: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
