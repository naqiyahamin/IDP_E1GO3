import { useState } from 'react';
import { LogIn, ShieldAlert, Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2, BellRing, SquarePen } from 'lucide-react';
import { ALLOWED_USERS, type AllowedUser } from '../auth';
import { useAppState } from '../context';

interface LoginPageProps {
  onLogin: (user: AllowedUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { resetUserPassword, verifyStateCredentials } = useAppState();

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password Flow States
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Pipeline management steps: 'INPUT' -> 'NOTIFIED_LINK' -> 'SET_NEW_PASSWORD'
  const [recoveryStep, setRecoveryStep] = useState<'INPUT' | 'NOTIFIED_LINK' | 'SET_NEW_PASSWORD'>('INPUT');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // FIX: Authenticate using the state context validator to notice modified user credentials
    const matchedUser = verifyStateCredentials(email, password);

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setError('Invalid UTM email identifier or wrong password. Please try again.');
    }
  };

  // Step 1: Validates that the input email is registered in the database, then reveals notification alert
  const handleRequestEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const targetEmail = recoveryEmail.trim().toLowerCase();

    if (!ALLOWED_USERS[targetEmail]) {
      setError('This email address does not exist inside our institutional registry database.');
      return;
    }

    setRecoveryStep('NOTIFIED_LINK');
  };

  // Step 2: Saves the new password payload to application state, completely invalidating the old key
  const handleFinalPasswordOverwrite = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword.trim()) {
      setError('Password cannot be empty.');
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const isSuccess = resetUserPassword(cleanEmail, newPassword.trim());

    if (isSuccess) {
      // Clear forms and automatically send user context coordinates back into active standard form login
      setEmail(cleanEmail);
      setPassword('');
      setIsForgotPasswordMode(false);
      setRecoveryEmail('');
      setNewPassword('');
      setRecoveryStep('INPUT');
      alert(`Success! Password for ${cleanEmail} has been overwritten. The old password is no longer valid.`);
    } else {
      setError('Failed to update credentials database state record.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
        
        {/* TOP BRANDING HEADER AREA */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-utm-maroon/10 mb-2">
            {isForgotPasswordMode ? (
              <KeyRound className="w-6 h-6 text-utm-maroon" />
            ) : (
              <LogIn className="w-6 h-6 text-utm-maroon" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">UTM FKE Lab Inventory</h2>
          <p className="text-xs text-gray-500">
            {isForgotPasswordMode 
              ? 'Institutional registry security passcode bypass recovery link'
              : 'Sign in using your institutional registry credentials'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 flex items-center gap-2 text-red-700 text-[11px] font-medium animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE MODE ACTION 1: FORGOT PASSWORD ROUTE    */}
        {/* ---------------------------------------------------- */}
        {isForgotPasswordMode ? (
          <div className="space-y-4">
            
            {/* SUB-STEP A: TYPE INSTITUTIONAL LOGIN EMAIL */}
            {recoveryStep === 'INPUT' && (
              <form onSubmit={handleRequestEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Verify Institutional Email</label>
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
                  <p className="text-[10px] text-gray-400 mt-1">Type the exact institutional address you use to sign in.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-utm-maroon hover:bg-utm-maroon-dark text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  Send Verification Password Reset Link
                </button>
              </form>
            )}

            {/* SUB-STEP B: SEND SIMULATED NOTIFICATION ALERT LINK ADDRESS RESPONSE */}
            {recoveryStep === 'NOTIFIED_LINK' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-800 mx-auto">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Simulated Notification Alert Sent!</h4>
                  <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                    A secure authentication setup token link has been pushed to your email box: <strong className="font-mono text-utm-maroon">{recoveryEmail}</strong>.
                  </p>
                </div>
                <div className="bg-white border border-dashed border-amber-300 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 mb-2">Click this link inside your email box to reset password:</p>
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('SET_NEW_PASSWORD')}
                    className="w-full bg-gray-900 hover:bg-black text-amber-400 font-mono font-bold text-[10px] py-2 rounded border border-gray-800 tracking-wide transition-colors"
                  >
                    https://fkelab.utm.my/auth/reset-token?user=secure_link
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STEP C: ENTER NEW PASSWORD & MUTATE ACCORDINGLY */}
            {recoveryStep === 'SET_NEW_PASSWORD' && (
              <form onSubmit={handleFinalPasswordOverwrite} className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-[10px] text-blue-800 flex gap-2">
                  <SquarePen className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
                  <span>Modifying identity profile passcode for: <strong className="font-mono text-gray-900">{recoveryEmail}</strong></span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Establish New Passcode Key</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new account passcode..."
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
                  <p className="text-[10px] text-red-600 mt-1 font-medium">⚠️ Note: Setting a new password will completely block your old one.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                >
                  Save Changes & Apply New Passcode
                </button>
              </form>
            )}

            {/* SHARED RECOVERY VIEW FOOTER ACTIONS LINK */}
            <div className="text-center pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordMode(false);
                  setRecoveryStep('INPUT');
                  setError('');
                }}
                className="text-xs text-gray-500 hover:text-utm-maroon font-semibold inline-flex items-center gap-1 transition-colors focus:outline-none"
              >
                <ArrowLeft className="w-3 h-3" /> Cancel and go back to login page
              </button>
            </div>
          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* INTERACTIVE MODE ACTION 2: STANDARD CREDENTIALS PATH */
          /* ---------------------------------------------------- */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
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
                  placeholder="Enter laboratory passcode..."
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
              <p className="text-[10px] text-gray-400 mt-1">
                Development testing key:{' '}
                <code className="font-mono bg-gray-100 px-1 rounded text-gray-600">fkelab2026</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-utm-maroon hover:bg-utm-maroon-dark text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              Authenticate Credentials
            </button>
          </form>
        )}

      </div>
    </div>
  );
}