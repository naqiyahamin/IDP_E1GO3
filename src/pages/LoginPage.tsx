import { useState } from 'react';

import { LogIn, ShieldAlert, Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { verifyCredentials, type AllowedUser } from '../auth';

import { useAppState } from '../context';



interface LoginPageProps {

  onLogin: (user: AllowedUser) => void;

}



export default function LoginPage({ onLogin }: LoginPageProps) {

  const { resetUserPassword } = useAppState();



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

  const [recoveryStep, setRecoveryStep] = useState<'INPUT' | 'VERIFIED'>('INPUT');

  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState('');



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    setError('');



    const matchedUser = verifyCredentials(email, password);



    if (matchedUser) {

      onLogin(matchedUser);

    } else {

      setError('Invalid UTM email identifier or wrong password. Please try again.');

    }

  };



  const handleForgotPasswordSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    setError('');



    if (!recoveryEmail.trim() || !newPassword.trim()) {

      setError('Please provide all necessary verification recovery fields.');

      return;

    }



    // Call the global context reset password logic to persist updates 

    if (resetUserPassword) {

      resetUserPassword(recoveryEmail.trim().toLowerCase(), newPassword.trim());

    }



    setRecoverySuccessMessage(`Verification complete! Password updated for ${recoveryEmail}. Please log in.`);

    setRecoveryStep('VERIFIED');

    

    // Clear out form properties

    setRecoveryEmail('');

    setNewPassword('');

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

            {recoveryStep === 'VERIFIED' ? (

              <div className="space-y-4 text-center py-2">

                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-2 text-emerald-800 text-[11px] font-medium text-left">

                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />

                  <span>{recoverySuccessMessage}</span>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    setIsForgotPasswordMode(false);

                    setRecoveryStep('INPUT');

                    setRecoverySuccessMessage('');

                  }}

                  className="text-xs text-utm-maroon font-bold hover:underline inline-flex items-center gap-1"

                >

                  <ArrowLeft className="w-3 h-3" /> Return back to active login page

                </button>

              </div>

            ) : (

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">

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

                </div>



                <button

                  type="submit"

                  className="w-full bg-utm-maroon hover:bg-utm-maroon-dark text-white font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"

                >

                  Verify Email & Reset Password

                </button>



                <div className="text-center">

                  <button

                    type="button"

                    onClick={() => {

                      setIsForgotPasswordMode(false);

                      setError('');

                    }}

                    className="text-xs text-gray-500 hover:text-utm-maroon font-medium transition-colors"

                  >

                    Cancel and go back

                  </button>

                </div>

              </form>

            )}

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