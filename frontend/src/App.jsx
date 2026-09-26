import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import Landing from "@/pages/Landing";
import DriverDashboard from "@/pages/DriverDashboard";
import OperatorDashboard from "@/pages/OperatorDashboard";

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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;