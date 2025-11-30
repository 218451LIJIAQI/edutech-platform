import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { usePageTitle } from '@/hooks';
import { BookOpen, Mail, Lock, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Register Page Component
 */
const RegisterPage = () => {
  usePageTitle('Create Account');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.STUDENT,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      
      // Redirect based on user role - get from store after registration completes
      const { user } = useAuthStore.getState();
      const userRole = user?.role;
      
      switch (userRole) {
        case UserRole.ADMIN:
          navigate('/admin');
          break;
        case UserRole.TEACHER:
          navigate('/teacher');
          break;
        case UserRole.STUDENT:
          navigate('/student');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err instanceof Error) {
        // Handle axios error response
        if ('response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || err.message || errorMessage;
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
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/30 to-indigo-100/50"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Floating orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-float delay-300"></div>
      <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-purple-400/15 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="max-w-lg w-full relative z-10 animate-fadeInUp">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white rounded-2xl mb-6 shadow-xl shadow-primary-500/30 transform hover:scale-110 hover:rotate-3 transition-all duration-300">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Create Your Account</h2>
          <p className="text-gray-500 text-base font-medium">Join thousands of learners worldwide</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 p-8 border border-white/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-danger-50 border border-danger-200/60 text-danger-700 px-4 py-3.5 rounded-xl animate-scaleIn">
                <div className="flex-shrink-0 w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-danger-600" />
                </div>
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="input"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="input"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input pl-12 group-hover:border-primary-300 transition-colors"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: UserRole.STUDENT })}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left group ${
                    formData.role === UserRole.STUDENT
                      ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                      formData.role === UserRole.STUDENT ? 'bg-primary-100' : 'bg-gray-100 group-hover:bg-primary-50'
                    }`}>
                      🎓
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Learn</div>
                      <div className="text-xs text-gray-500">As a Student</div>
                    </div>
                  </div>
                  {formData.role === UserRole.STUDENT && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: UserRole.TEACHER })}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left group ${
                    formData.role === UserRole.TEACHER
                      ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                      formData.role === UserRole.TEACHER ? 'bg-primary-100' : 'bg-gray-100 group-hover:bg-primary-50'
                    }`}>
                      👨‍🏫
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Teach</div>
                      <div className="text-xs text-gray-500">As a Teacher</div>
                    </div>
                  </div>
                  {formData.role === UserRole.TEACHER && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input pl-12 pr-12 group-hover:border-primary-300 transition-colors"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="input pl-12 pr-12 group-hover:border-primary-300 transition-colors"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-base font-bold rounded-xl mt-4 group"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner spinner-sm"></div>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">Already have an account?</span>
            </div>
          </div>

          <Link 
            to="/login" 
            className="btn-outline w-full py-3.5 text-base font-semibold rounded-xl flex items-center justify-center gap-2 group"
          >
            Sign in instead
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </Link>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

