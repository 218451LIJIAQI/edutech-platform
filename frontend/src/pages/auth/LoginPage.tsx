import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { usePageTitle } from '@/hooks';
import { BookOpen, AlertCircle, Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

/**
 * Login Page Component
 */
const LoginPage = () => {
  usePageTitle('Sign In');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });
      
      // Get user role after login completes
      const currentUser = useAuthStore.getState().user;
      const userRole = currentUser?.role;
      
      // Redirect based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          navigate('/admin', { replace: true });
          break;
        case UserRole.TEACHER:
          navigate('/teacher', { replace: true });
          break;
        case UserRole.STUDENT:
          navigate('/student', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (err instanceof Error) {
        if ('response' in err) {
          const responseError = err as { response?: { data?: { message?: string } } };
          errorMessage = responseError.response?.data?.message || errorMessage;
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/40"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Floating orbs with enhanced animation */}
      <div className="absolute top-20 right-[10%] w-80 h-80 bg-gradient-to-br from-primary-400/20 to-indigo-400/20 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl animate-float delay-200"></div>
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary-300/10 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="max-w-md w-full relative z-10 animate-fadeInUp">
        {/* Logo and Header */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 text-white rounded-2xl mb-6 shadow-2xl shadow-primary-500/30 transform hover:scale-105 hover:rotate-2 transition-all duration-300 group">
            <BookOpen className="w-10 h-10" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-1 -right-1">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-400"></span>
              </span>
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Welcome Back</h2>
          <p className="text-gray-500 text-base font-medium">Sign in to continue your learning journey</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/5 to-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {error && (
              <div 
                className="flex items-center gap-3 bg-danger-50 border border-danger-200/60 text-danger-700 px-4 py-3.5 rounded-xl animate-scaleIn"
                role="alert"
                aria-live="polite"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-danger-600" aria-hidden="true" />
                </div>
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
                  className="input pl-12 group-hover:border-primary-300 transition-colors"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={error && !email.trim() ? 'true' : undefined}
                  aria-describedby={error && !email.trim() ? 'email-error' : undefined}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  minLength={6}
                  className="input pl-12 pr-12 group-hover:border-primary-300 transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  aria-invalid={error && !password ? 'true' : undefined}
                  aria-describedby={error && !password ? 'password-error' : undefined}
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-base font-bold rounded-xl mt-6 group bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:via-primary-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={isLoading ? 'Signing in...' : 'Sign in'}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner spinner-sm spinner-white" aria-hidden="true"></div>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/80"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">New to Edutech?</span>
            </div>
          </div>

          <Link 
            to="/register" 
            className="w-full py-3.5 text-base font-semibold rounded-xl flex items-center justify-center gap-2 group border-2 border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300"
          >
            <Sparkles className="w-4 h-4" />
            Create an account
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Footer links */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>By signing in, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

