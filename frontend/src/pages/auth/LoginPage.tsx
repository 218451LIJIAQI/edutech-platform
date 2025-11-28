import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { BookOpen } from 'lucide-react';

/**
 * Login Page Component
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      
      // Redirect based on user role
      const userRole = useAuthStore.getState().user?.role;
      
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
      const message = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message 
        : err instanceof Error 
        ? err.message 
        : undefined;
      setError(message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-600 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white rounded-3xl mb-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
            <BookOpen className="w-12 h-12" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-3 leading-tight">Welcome Back</h2>
          <p className="text-gray-600 text-lg">Sign in to continue your learning journey</p>
        </div>

        <div className="card shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 text-red-700 px-4 py-4 rounded-xl shadow-sm">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-600 focus:ring-2 focus:ring-primary-200 transition-all duration-200 text-base"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="input w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-600 focus:ring-2 focus:ring-primary-200 transition-all duration-200 text-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-base font-bold uppercase tracking-wide rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <span className="text-gray-600 text-sm">Don't have an account? </span>
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-bold transition-colors hover:underline">
              Sign up now
            </Link>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>By signing in, you agree to our <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

