import { useState } from 'react';
import { Redirect } from 'wouter';
import { ShieldCheck, AlertCircle, Loader2, LogIn, Lock, Mail } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLogin() {
  const { admin, login } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      // On success the admin route guard takes over and swaps this screen out
    } catch (err) {
      setError(err.message || 'Admin sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Already signed in — no reason to show the form again
  if (admin) return <Redirect to="/admin" />;

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex p-3 rounded-2xl bg-brand-orange mb-4">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FleetLink Admin</h1>
          <p className="text-sm text-white/50 mt-1">
            Restricted access. Administrator credentials only.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Admin Email <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@fleetlink.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-navy mb-1">
                Password <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Your admin password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-2.5 rounded-lg font-bold text-sm hover:bg-brand-navy-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Verifying...</>
              ) : (
                <><LogIn size={16} /> Sign in to Admin</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100">
            Driver and Fleet Operator accounts cannot sign in here.
          </p>
        </div>

        <p className="text-center text-xs text-white/30 mt-5">
          <a href="/" className="hover:text-white/60 transition-colors">
            ← Back to FleetLink
          </a>
        </p>
      </div>
    </div>
  );
}
