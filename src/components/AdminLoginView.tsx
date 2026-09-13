import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Store,
  ChevronLeft,
} from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext.js';

interface AdminLoginViewProps {
  onBackToNormalLogin?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onBackToNormalLogin }) => {
  const { loginAsAdmin } = useAuth();

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both Admin Email and Password.');
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setErrorMessage('Access denied. Only designated administrator account allowed.');
      return;
    }

    setLoading(true);
    try {
      await loginAsAdmin(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-900/50 p-6 sm:p-8 space-y-6">
        {/* Navigation & Header */}
        <div>
          {onBackToNormalLogin && (
            <button
              type="button"
              onClick={onBackToNormalLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-3 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Shopkeeper Login</span>
            </button>
          )}

          <div className="flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-xl font-black text-center tracking-tight text-white">
            Kirana Admin Portal
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1">
            Restricted administrative system access
          </p>
        </div>

        {/* Security Alert Badge */}
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">Authorized Personnel Only</p>
            <p className="text-[11px] text-amber-200/70">
              Access is strictly restricted to <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100">{ADMIN_EMAIL}</code>.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="admin-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                placeholder={ADMIN_EMAIL}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Admin Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="Enter Firebase admin password"
              />
              <button
                type="button"
                id="admin-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="admin-login-submit-btn"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Authenticate Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Details Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authenticated directly against Firebase Identity</span>
        </div>
      </div>
    </div>
  );
};
