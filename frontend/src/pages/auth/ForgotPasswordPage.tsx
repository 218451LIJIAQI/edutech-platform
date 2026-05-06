import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '@/services/auth.service';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';

type Step = 'email' | 'verify' | 'newPassword' | 'success';

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const canShowDevCodeHint = import.meta.env.DEV;

const ForgotPasswordPage = () => {
  usePageTitle('Forgot Password');
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const resetVerificationState = () => {
    setVerificationCode('');
    setResetToken('');
    setDevCodeHint('');
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.requestPasswordReset(email.trim());
      setDevCodeHint(canShowDevCodeHint ? result.devCode ?? '' : '');
      setVerificationCode('');
      setResetToken('');
      toast.success('If the account exists, a verification code has been issued.');
      setStep('verify');
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          'Failed to request a verification code'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.verifyPasswordResetCode(
        email.trim(),
        verificationCode
      );
      setResetToken(result.resetToken);
      toast.success('Verification code accepted');
      setStep('newPassword');
    } catch (verifyError) {
      setError(
        extractErrorMessage(verifyError, 'Failed to verify the reset code')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resetToken) {
      setError('Your reset session expired, please request a new code');
      setStep('email');
      resetVerificationState();
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!PASSWORD_COMPLEXITY.test(newPassword)) {
      setError('Password must contain uppercase, lowercase, and a number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(resetToken, newPassword);
      setDevCodeHint('');
      toast.success('Password reset successfully');
      setStep('success');
    } catch (resetError) {
      const message = extractErrorMessage(
        resetError,
        'Failed to reset password'
      );
      setError(message);
      if (message.toLowerCase().includes('reset session')) {
        setStep('email');
        resetVerificationState();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/40"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="max-w-md w-full relative z-10 animate-fadeInUp">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-success-100 to-success-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">Password Reset Complete</h2>
            <p className="text-gray-500 mb-8">
              Your password has been updated. Sign in with the new password to continue.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-4 text-base font-bold rounded-xl bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/40"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <div className="absolute top-20 right-[10%] w-80 h-80 bg-gradient-to-br from-primary-400/20 to-indigo-400/20 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl animate-float delay-200"></div>

      <div className="max-w-md w-full relative z-10 animate-fadeInUp">
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 text-white rounded-2xl mb-6 shadow-2xl shadow-primary-500/30">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
            {step === 'email' && 'Forgot Password'}
            {step === 'verify' && 'Enter Verification Code'}
            {step === 'newPassword' && 'Set New Password'}
          </h2>
          <p className="text-gray-500 text-base">
            {step === 'email' &&
              'Enter your account email and we will issue a reset code.'}
            {step === 'verify' && `Enter the 6-digit code for ${email}`}
            {step === 'newPassword' &&
              'Create a strong password with uppercase, lowercase, and a number.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {['email', 'verify', 'newPassword'].map((value, idx) => (
            <div key={value} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === value
                    ? 'bg-primary-600 text-white'
                    : ['email', 'verify', 'newPassword'].indexOf(step) > idx
                      ? 'bg-success-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {['email', 'verify', 'newPassword'].indexOf(step) > idx ? 'v' : idx + 1}
              </div>
              {idx < 2 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    ['email', 'verify', 'newPassword'].indexOf(step) > idx
                      ? 'bg-success-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80">
          {error && (
            <div className="flex items-center gap-3 bg-danger-50 border border-danger-200/60 text-danger-700 px-4 py-3.5 rounded-xl animate-scaleIn mb-5">
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="input pl-12 group-hover:border-primary-300 transition-colors"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-base font-bold rounded-xl mt-6 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner spinner-sm spinner-white" aria-hidden="true"></div>
                    Sending Code...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Send Verification Code
                  </span>
                )}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="code" className="block text-sm font-semibold text-gray-700">
                  Verification Code
                </label>
                <div className="relative group">
                  <input
                    id="code"
                    type="text"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    className="input pl-12 text-center text-2xl font-mono group-hover:border-primary-300 transition-colors"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      if (error) {
                        setError('');
                      }
                    }}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
                {canShowDevCodeHint ? (
                  <p className="text-xs text-gray-500 mt-2">
                    Use the 6-digit code issued for this account. In local development, a temporary code appears below when available.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    Use the 6-digit code issued for this account.
                  </p>
                )}
              </div>

              {canShowDevCodeHint && devCodeHint && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-primary-700">
                    Local Dev Code
                  </p>
                  <p className="mt-1 text-lg font-mono font-bold text-primary-900">
                    {devCodeHint}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-base font-bold rounded-xl mt-6 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner spinner-sm spinner-white" aria-hidden="true"></div>
                    Verifying...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  resetVerificationState();
                  setError('');
                }}
                className="w-full text-sm text-gray-500 hover:text-primary-600 transition-colors mt-2"
              >
                Need a new code? Go back
              </button>
            </form>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handleSetPassword} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <div className="relative group">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    autoComplete="new-password"
                    className="input pl-12 pr-12 group-hover:border-primary-300 transition-colors"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>
                <div className="relative group">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="input pl-12 pr-12 group-hover:border-primary-300 transition-colors"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Minimum 8 characters with uppercase, lowercase, and a number.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-base font-bold rounded-xl mt-6 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner spinner-sm spinner-white" aria-hidden="true"></div>
                    Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
