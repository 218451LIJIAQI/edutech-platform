import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, User, LogOut, LayoutDashboard, ShoppingCart, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import NotificationCenter from '../common/NotificationCenter';

/**
 * Navigation Bar Component
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case UserRole.STUDENT:
        return '/student';
      case UserRole.TEACHER:
        return '/teacher';
      case UserRole.ADMIN:
        return '/admin';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg group-hover:shadow-lg transition-all">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Edutech</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/courses"
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
            >
              Courses
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/teachers"
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
            >
              Teachers
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {/* Notification Center */}
                <NotificationCenter />
                
                {/* Student quick links */}
                {user?.role === UserRole.STUDENT && (
                  <>
                    <Link
                      to="/cart"
                      className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors duration-300 p-2 hover:bg-primary-50 rounded-lg"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span className="hidden md:inline text-sm font-medium">Cart</span>
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors duration-300 p-2 hover:bg-primary-50 rounded-lg"
                    >
                      <Receipt className="w-5 h-5" />
                      <span className="hidden md:inline text-sm font-medium">Orders</span>
                    </Link>
                  </>
                )}
                
                <Link
                  to={getDashboardLink()}
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors duration-300 p-2 hover:bg-primary-50 rounded-lg"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="hidden md:inline text-sm font-medium">Dashboard</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors duration-300 p-2 hover:bg-primary-50 rounded-lg"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline text-sm font-medium">{user?.firstName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors duration-300 p-2 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline text-sm font-medium">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline btn-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

