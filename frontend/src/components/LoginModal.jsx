import { useState } from 'react';
import { X, AlertCircle, Loader2, LogIn, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const { login } = useAuth();

  // Views: 'login' | 'forgot'
  const [view, setView] = useState('login');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setEmail('');
    setPassword('');
    setError('');
    setView('login');
    setForgotEmail('');
    setForgotSent(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ── Login Submit ────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email.trim(), password);

      if (user.role === 'owner_driver') {
        window.location.href = '/dashboard/driver';
      } else if (user.role === 'fleet_operator') {
        window.location.href = '/dashboard/operator';
      }

      handleClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Submit ──────────────────────────────────────────────────
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    // In a real app this would call an API. For now just show success message.
    setForgotSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        {/* ── LOGIN VIEW ── */}
        {view === 'login' && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-brand-navy/10 rounded-lg">
                <LogIn size={22} className="text-brand-navy" />
              </div>
              <div>
                <h2 className="text-2xl font-serif text-brand-navy">Welcome back</h2>
                <p className="text-gray-500 text-xs mt-0.5">Sign in to your FleetLink account</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-1">
                  Email Address <span className="text-brand-orange">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-1">
                  Password <span className="text-brand-orange">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Your password"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition-all placeholder:text-gray-400"
                />
                {/* Forgot Password Link — below the input */}
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => { setError(''); setView('forgot'); setForgotEmail(email); }}
                    className="text-xs text-brand-orange font-semibold hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-navy text-white py-2.5 rounded-lg font-bold text-base hover:bg-brand-navy-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /><span>Signing in...</span></>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Only Owner Drivers &amp; Fleet Operators can sign in.
              </p>
            </form>

            {/* Switch to Register */}
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { handleClose(); onSwitchToRegister(); }}
                  className="text-brand-orange font-semibold hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === 'forgot' && (
          <div className="p-6">
            {/* Back button */}
            <button
              onClick={() => { setView('login'); setForgotSent(false); setForgotEmail(''); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy transition-colors mb-5"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-brand-orange/10 rounded-lg">
                <Mail size={22} className="text-brand-orange" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-brand-navy">Forgot Password?</h2>
                <p className="text-gray-500 text-xs mt-0.5">Enter your email to receive a reset link</p>
              </div>
            </div>

            {forgotSent ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-green-600" />
                </div>
                <h3 className="font-bold text-brand-navy text-base mb-2">Check your inbox</h3>
                <p className="text-sm text-gray-600 mb-1">
                  If an account exists for <span className="font-semibold text-brand-navy">{forgotEmail}</span>,
                </p>
                <p className="text-sm text-gray-600 mb-5">
                  a password reset link has been sent.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Didn&apos;t receive it? Check your spam folder or contact our support team at{' '}
                  <a href="mailto:support@fleetlink.com.au" className="text-brand-orange hover:underline">
                    support@fleetlink.com.au
                  </a>
                </p>
                <button
                  onClick={() => { setView('login'); setForgotSent(false); }}
                  className="w-full py-2.5 rounded-lg bg-brand-navy text-white font-bold text-sm hover:bg-brand-navy-mid transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              /* Email input form */
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-brand-navy mb-1">
                    Email Address <span className="text-brand-orange">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition-all placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-brand-orange text-white font-bold text-sm hover:bg-orange-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={16} />
                  Send Reset Link
                </button>

                <p className="text-xs text-gray-400 text-center">
                  We&apos;ll send a password reset link to this email if it&apos;s registered with us.
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
