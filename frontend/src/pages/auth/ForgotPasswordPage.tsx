import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { usePageTitle } from '@/hooks';

/**
 * Forgot Password Page
 * Allows users to request a password reset email
 */
const ForgotPasswordPage = () => {
  usePageTitle('Forgot Password');
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      // TODO: Implement actual password reset API call
      // await authService.forgotPassword(email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
    } catch (_err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/40"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="max-w-md w-full relative z-10 animate-fadeInUp">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-success-100 to-success-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
            <p className="text-gray-500 mb-6">
              We've sent a password reset link to <span className="font-semibold text-gray-700">{email}</span>
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Didn't receive the email? Check your spam folder or try again with a different email address.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="w-full px-4 py-3 text-primary-600 font-semibold bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
              >
                Try Different Email
              </button>
              <Link
                to="/login"
                className="w-full px-4 py-3 text-gray-600 font-medium hover:text-gray-900 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/40"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Floating orbs */}
      <div className="absolute top-20 right-[10%] w-80 h-80 bg-gradient-to-br from-primary-400/20 to-indigo-400/20 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl animate-float delay-200"></div>

      <div className="max-w-md w-full relative z-10 animate-fadeInUp">
        {/* Logo and Header */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 text-white rounded-2xl mb-6 shadow-2xl shadow-primary-500/30">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Forgot Password?</h2>
          <p className="text-gray-500 text-base">No worries, we'll send you reset instructions</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-danger-50 border border-danger-200/60 text-danger-700 px-4 py-3.5 rounded-xl animate-scaleIn">
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}

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
                    if (error) setError('');
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
              className="w-full py-4 text-base font-bold rounded-xl mt-6 group bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner spinner-sm spinner-white" aria-hidden="true"></div>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Reset Link
                </span>
              )}
            </button>
          </form>

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
