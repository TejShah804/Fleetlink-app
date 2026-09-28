import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";

import Landing from "@/pages/Landing";
import DriverDashboard from "@/pages/DriverDashboard";
import OperatorDashboard from "@/pages/OperatorDashboard";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

const queryClient = new QueryClient();

// ── Protected Route Wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-10 h-10 text-brand-orange" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="17" stroke="#F68520" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/" />;
  if (role && user.role !== role) {
    // Redirect to correct dashboard
    if (user.role === 'owner_driver') return <Redirect to="/dashboard/driver" />;
    if (user.role === 'fleet_operator') return <Redirect to="/dashboard/operator" />;
    return <Redirect to="/" />;
  }

  return children;
}

// ── Admin Route Guard ───────────────────────────────────────────────────────
// Uses its own session (AdminAuthContext) so it never interferes with the
// driver / operator login, and sends signed-out visitors to the admin login.
function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-10 h-10 text-brand-orange" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="17" stroke="#F68520" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-white/50 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!admin) return <Redirect to="/admin/login" />;

  return children;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />

      <Route path="/dashboard/driver">
        <ProtectedRoute role="owner_driver">
          <DriverDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/operator">
        <ProtectedRoute role="fleet_operator">
          <OperatorDashboard />
        </ProtectedRoute>
      </Route>

      {/* Admin Panel */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>

      {/* Fallback */}
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminAuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
