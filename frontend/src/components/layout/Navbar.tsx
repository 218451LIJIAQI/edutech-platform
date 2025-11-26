import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, User, LogOut, LayoutDashboard, ShoppingCart, Receipt, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import NotificationCenter from '../common/NotificationCenter';
import { useEffect, useState } from 'react';
import messageService from '@/services/message.service';

/**
 * Navigation Bar Component
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadMessageCount();
      const interval = setInterval(fetchUnreadMessageCount, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchUnreadMessageCount = async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Failed to fetch unread message count:', error);
    }
  };

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
            {user?.role === UserRole.STUDENT ? (
              <>
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
                <Link
                  to="/community"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Community
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/student/reports"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Report
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group flex items-center gap-2"
                >
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            ) : user?.role === UserRole.TEACHER ? (
              <>
                <Link
                  to="/teacher/courses"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  My Courses
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/teacher/courses/new"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Create Course
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/teacher/students-management"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Student Management
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group flex items-center gap-2"
                >
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            ) : user?.role === UserRole.ADMIN ? (
              <>
                <Link
                  to="/admin/verification-teachers"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Verification Teachers
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/messages"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group flex items-center gap-2"
                >
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            ) : (
              <>
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
                <Link
                  to="/help"
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 relative group"
                >
                  Help
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </>
            )}
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
                  type="button"
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

