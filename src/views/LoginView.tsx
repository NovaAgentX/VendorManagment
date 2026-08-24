import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User as UserIcon, Lock, Mail, ArrowRight, Database, ArrowLeft, ShieldAlert } from 'lucide-react';

interface LoginViewProps {
  onOpenDeploymentGuide?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenDeploymentGuide }) => {
  const { login, isLoading } = useAuth();

  // Active portal mode: default is ALWAYS 'user' for public visitors so operators never see admin options
  const [portal, setPortal] = useState<'admin' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'admin' || params.get('admin') === 'true' || window.location.hash === '#admin') {
        return 'admin';
      }
    }
    return 'user';
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Hidden admin access shortcut (e.g., Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        switchPortal(portal === 'admin' ? 'user' : 'admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [portal]);

  // Sync URL query when switching portal
  const switchPortal = (targetPortal: 'admin' | 'user') => {
    setPortal(targetPortal);
    setIdentifier('');
    setPassword('');
    setAuthError(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (targetPortal === 'admin') {
        url.searchParams.set('portal', 'admin');
      } else {
        url.searchParams.delete('portal');
        url.searchParams.delete('admin');
        if (window.location.hash === '#admin') {
          window.location.hash = '';
        }
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setAuthError(null);
    setIsSubmitting(true);
    const success = await login(identifier, password, portal === 'admin' ? 'ADMIN' : 'USER');
    if (!success) {
      if (portal === 'admin' && (identifier.toLowerCase().includes('user') || identifier.toLowerCase().startsWith('usr-'))) {
        setAuthError('Access Denied: Standard operator credentials cannot authenticate on the Administrative Portal.');
      } else if (portal === 'user' && (identifier.toLowerCase().includes('admin') || identifier.toLowerCase().startsWith('adm-') || identifier.toLowerCase().startsWith('sa-'))) {
        setAuthError('Invalid operator credentials. Please verify your Operator ID and password.');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
      {portal === 'admin' ? (
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      ) : (
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Main Brand & Portal Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all ${
            portal === 'admin'
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/25'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-600/25'
          }`}
        >
          {portal === 'admin' ? <ShieldCheck className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {portal === 'admin' ? 'Administrative & Executive Portal' : 'Operator Staff Sign-In'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {portal === 'admin'
            ? 'Restricted Access: Super Administrator & Team Administrators Only'
            : 'Access your assigned vendor records and log campaign operations'}
        </p>
      </div>

      {/* Portal Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg z-10">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          {/* Security Banner for Admin Portal ONLY */}
          {portal === 'admin' && (
            <div className="mb-5 p-3.5 rounded-2xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Executive Management Gate</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                  Authorized administrators only. Controls system settings, duplicate audits, and team oversight.
                </p>
              </div>
            </div>
          )}

          {/* User Portal Welcome Notice */}
          {portal === 'user' && (
            <div className="mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <UserIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Operator Campaign Portal</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sign in with your assigned operator credentials to manage your vendor campaigns.
                </p>
              </div>
            </div>
          )}

          {/* Error notification */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {portal === 'admin' ? 'Administrator Email or ID' : 'Operator Email or User ID'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="text"
                  required
                  placeholder={
                    portal === 'admin'
                      ? 'e.g. superadmin@company.com or ADM-0001'
                      : 'e.g. user1@company.com or USR-0001'
                  }
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer ${
                portal === 'admin'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              <span>
                {isSubmitting
                  ? 'Authenticating...'
                  : portal === 'admin'
                  ? 'Sign In to Admin Portal'
                  : 'Sign In as Operator'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            {portal === 'admin' ? (
              <button
                id="exit-admin-portal-btn"
                type="button"
                onClick={() => switchPortal('user')}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Admin Mode</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400">
                <span>Authorized Operator Access</span>
              </div>
            )}

            {onOpenDeploymentGuide && portal === 'admin' && (
              <button
                id="login-deployment-guide-btn"
                type="button"
                onClick={onOpenDeploymentGuide}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Apps Script Guide</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean Operator Footer without any admin indicators */}
      {portal === 'user' && (
        <div className="mt-8 text-center text-slate-400 dark:text-slate-600 text-[11px] select-none">
          <span>Campaign Operations Portal &copy; {new Date().getFullYear()} &bull; All Rights Reserved</span>
        </div>
      )}
    </div>
  );
};
