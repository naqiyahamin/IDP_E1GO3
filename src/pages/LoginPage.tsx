import { useState } from 'react';
import {
  LogIn,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import {
  sendPasswordResetEmail,
  updateCurrentUserPassword,
  verifyCredentials,
  type AllowedUser,
} from '../auth';

interface LoginPageProps {
  onLogin: (user: AllowedUser) => void;
  isResetPasswordMode?: boolean;
}

export default function LoginPage({
  onLogin,
  isResetPasswordMode = false,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const showRecoveryScreen = isForgotPasswordMode || isResetPasswordMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const matchedUser = await verifyCredentials(email, password);

      if (matchedUser) {
        onLogin(matchedUser);
      } else {
        setError('Invalid UTM email identifier or wrong password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (!recoveryEmail.trim()) {
        setError('Please enter your registered institutional email.');
        return;
      }

      const result = await sendPasswordResetEmail(recoveryEmail);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setRecoveryEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (!newPassword.trim() || !confirmNewPassword.trim()) {
        setError('Please enter and confirm your new password.');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setError('The new password and confirmation password do not match.');
        return;
      }

      if (newPassword.length < 6) {
        setError('Your new password must be at least 6 characters long.');
        return;
      }

      const result = await updateCurrentUserPassword(newPassword);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setNewPassword('');
      setConfirmNewPassword('');

      window.history.replaceState({}, '', '/');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-utm-maroon/10 mb-2">
            {showRecoveryScreen ? (
              <KeyRound className="w-6 h-6 text-utm-maroon" />
            ) : (
              <LogIn className="w-6 h-6 text-utm-maroon" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">UTM FKE Lab Inventory</h2>
          <p className="text-xs text-gray-500">
            {isResetPasswordMode
              ? 'Create a new Supabase account password'
              : showRecoveryScreen
                ? 'Send a Supabase password reset link to your email'
                : 'Sign in using your institutional Supabase credentials'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-center gap-2 text-red-700 text-[11px] font-medium animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-start gap-2 text-emerald-800 text-[11px] font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isResetPasswordMode ? (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-utm-maroon hover:bg-utm-maroon-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>

            {successMessage && (
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg transition-colors text-sm"
              >
                Return to Login
              </button>
            )}
          </form>
        ) : showRecoveryScreen ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Registered Institutional Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="name@graduate.utm.my or staff@utm.my"
                  className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-utm-maroon hover:bg-utm-maroon-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Sending Reset Email...' : 'Send Password Reset Email'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-gray-500 hover:text-utm-maroon font-medium transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Cancel and go back
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@graduate.utm.my or staff@utm.my"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] text-utm-maroon font-semibold hover:underline focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password..."
                  className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-utm-maroon hover:bg-utm-maroon-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Authenticate Credentials'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
