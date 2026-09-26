import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RegisterModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    role: '',
    password: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.role) {
        throw new Error('Please select your role.');
      }

      // Password required for driver or operator
      if ((formData.role === 'driver' || formData.role === 'operator') && (!formData.password || formData.password.length < 6)) {
        throw new Error('Password is required (minimum 6 characters).');
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone.trim(),
        phone: formData.phone.trim(),
        company_name: formData.company_name.trim() || undefined,
        message: formData.message.trim() || undefined,
        role: formData.role,
        ...(formData.password ? { password: formData.password } : {})
      };

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      setSuccess('Interest registered successfully! Our team will get in touch with you soon.');

      // Reset form and close after 2.5 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', company_name: '', role: '', password: '', message: '' });
        setSuccess('');
        onClose();
      }, 2500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          aria-label="Close Modal"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-serif text-brand-navy mb-1.5">
            Register your Interest
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Fill in your details and we'll get in touch with you about Owner Driver Collective.
          </p>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-brand-navy mb-1">
                Full Name <span className="text-brand-orange">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-brand-navy mb-1">
                Email Address <span className="text-brand-orange">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-brand-navy mb-1">
                Phone Number <span className="text-brand-orange">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="04XX XXX XXX"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            {/* Company / Business Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-bold text-brand-navy mb-1">
                Company / Business Name
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Your company name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 text-sm"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-bold text-brand-navy mb-1">
                Role
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all appearance-none bg-white text-gray-700 text-sm"
                >
                  <option value="" disabled>Select your role</option>
                  <option value="driver">Owner Driver</option>
                  <option value="operator">Fleet Operator</option>
                  <option value="other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password — only for Owner Driver & Fleet Operator */}
            {(formData.role === 'driver' || formData.role === 'operator') && (
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-brand-navy mb-1">
                  Create Password <span className="text-brand-orange">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You&apos;ll use this password to sign in to your dashboard.
                </p>
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-bold text-brand-navy mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows="2"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us a bit about your interest in ODC..."
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition-all placeholder:text-gray-400 resize-none text-sm"
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy text-white py-2.5 rounded-lg font-bold text-base hover:bg-brand-navy-mid transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  'Submit Interest'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
