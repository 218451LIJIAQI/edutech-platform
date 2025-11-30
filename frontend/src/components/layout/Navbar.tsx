import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, LogOut, LayoutDashboard, ShoppingCart, Receipt, Menu, X, 
  Sparkles, MessageSquare, Users, GraduationCap, Wallet, BarChart3,
  Shield, UserCheck, DollarSign, Settings, Compass, HelpCircle, User
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import NotificationCenter from '../common/NotificationCenter';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useEffect, useState, useCallback } from 'react';
import messageService from '@/services/message.service';
import clsx from 'clsx';

/**
 * Navigation Bar Component - Modern Design with Role-specific styling
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Role-based theme colors
  const getRoleTheme = () => {
    switch (user?.role) {
      case UserRole.TEACHER:
        return {
          gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
          shadow: 'shadow-emerald-500/20',
          hoverShadow: 'hover:shadow-emerald-500/30',
          bg: 'bg-emerald-50',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          badge: 'Teacher',
          icon: GraduationCap,
        };
      case UserRole.ADMIN:
        return {
          gradient: 'from-violet-500 via-violet-600 to-purple-600',
          shadow: 'shadow-violet-500/20',
          hoverShadow: 'hover:shadow-violet-500/30',
          bg: 'bg-violet-50',
          text: 'text-violet-600',
          border: 'border-violet-200',
          badge: 'Admin',
          icon: Shield,
        };
      default:
        return {
          gradient: 'from-primary-500 via-primary-600 to-indigo-600',
          shadow: 'shadow-primary-500/20',
          hoverShadow: 'hover:shadow-primary-500/30',
          bg: 'bg-primary-50',
          text: 'text-primary-600',
          border: 'border-primary-200',
          badge: 'Student',
          icon: User,
        };
    }
  };

  const theme = getRoleTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchUnreadMessageCount = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Failed to fetch unread message count:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadMessageCount();
      const interval = setInterval(fetchUnreadMessageCount, 30000);
      const handler = () => fetchUnreadMessageCount();
      window.addEventListener('messages:unread-updated', handler as EventListener);
      const onVisibility = () => {
        if (document.visibilityState === 'visible') fetchUnreadMessageCount();
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        clearInterval(interval);
        window.removeEventListener('messages:unread-updated', handler as EventListener);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
  }, [isAuthenticated, user, fetchUnreadMessageCount]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case UserRole.STUDENT: return '/student';
      case UserRole.TEACHER: return '/teacher';
      case UserRole.ADMIN: return '/admin';
      default: return '/';
    }
  };

  // Check if current path matches
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Navigation items based on role
  const getNavItems = () => {
    if (user?.role === UserRole.STUDENT) {
      return [
        { to: '/courses', label: 'Explore', icon: Compass },
        { to: '/teachers', label: 'Teachers', icon: Users },
        { to: '/community', label: 'Community', icon: MessageSquare },
        { to: '/student/reports', label: 'Progress', icon: BarChart3 },
      ];
    }
    if (user?.role === UserRole.TEACHER) {
      return [
        { to: '/teacher/courses', label: 'Courses', icon: BookOpen },
        { to: '/teacher/courses/new', label: 'Create', icon: Sparkles, highlight: true },
        { to: '/teacher/students-management', label: 'Students', icon: Users },
        { to: '/teacher/wallet', label: 'Earnings', icon: Wallet },
      ];
    }
    if (user?.role === UserRole.ADMIN) {
      return [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/financials', label: 'Finance', icon: DollarSign },
        { to: '/admin/verification-teachers', label: 'Verify', icon: UserCheck },
      ];
    }
    return [
      { to: '/courses', label: 'Courses', icon: BookOpen },
      { to: '/teachers', label: 'Teachers', icon: Users },
      { to: '/help', label: 'Help', icon: HelpCircle },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className={clsx(
      'sticky top-0 z-50 transition-all duration-300',
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100/50' 
        : 'bg-white/80 backdrop-blur-lg border-b border-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className={clsx(
              'relative p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-105',
              `bg-gradient-to-br ${theme.gradient} ${theme.shadow} group-hover:shadow-xl ${theme.hoverShadow}`
            )}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Edutech
              </span>
              {isAuthenticated && user && (
                <span className={clsx('text-[10px] font-semibold tracking-wider uppercase', theme.text)}>
                  {theme.badge} Portal
                </span>
              )}
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center">
            <div className={clsx(
              'flex items-center gap-1 p-1 rounded-2xl',
              isAuthenticated ? 'bg-gray-100/80' : ''
            )}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200',
                      active 
                        ? `bg-white shadow-sm ${theme.text}` 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60',
                      item.highlight && !active && `${theme.text} font-semibold`
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', item.highlight && 'animate-pulse')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {isAuthenticated ? (
              <>
                {/* Messages */}
                <Link
                  to="/messages"
                  className={clsx(
                    'relative p-2 rounded-xl transition-all duration-200',
                    isActive('/messages') 
                      ? `${theme.bg} ${theme.text}` 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <NotificationCenter />

                {/* Quick Actions for Student */}
                {user?.role === UserRole.STUDENT && (
                  <div className="hidden sm:flex items-center gap-1 ml-1 pl-2 border-l border-gray-200">
                    <Link
                      to="/cart"
                      className={clsx(
                        'p-2 rounded-xl transition-all duration-200',
                        isActive('/cart') 
                          ? `${theme.bg} ${theme.text}` 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </Link>
                    <Link
                      to="/orders"
                      className={clsx(
                        'p-2 rounded-xl transition-all duration-200',
                        isActive('/orders') 
                          ? `${theme.bg} ${theme.text}` 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Receipt className="w-5 h-5" />
                    </Link>
                  </div>
                )}

                {/* User Profile & Actions */}
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                  <Link
                    to={getDashboardLink()}
                    className={clsx(
                      'hidden sm:flex p-2 rounded-xl transition-all duration-200',
                      'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    )}
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                  
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold',
                      `bg-gradient-to-br ${theme.gradient}`
                    )}>
                      {user?.firstName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-gray-700">
                      {user?.firstName}
                    </span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors ml-1"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Sign in
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && isAuthenticated && (
          <div className="md:hidden py-4 border-t border-gray-100 animate-slide-down">
            {/* Role Badge */}
            <div className={clsx(
              'mx-4 mb-4 p-3 rounded-xl flex items-center gap-3',
              theme.bg
            )}>
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold',
                `bg-gradient-to-br ${theme.gradient}`
              )}>
                {user?.firstName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className={clsx('text-sm font-medium', theme.text)}>{theme.badge}</p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                      active 
                        ? `${theme.bg} ${theme.text}` 
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Messages in mobile */}
              <Link
                to="/messages"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all',
                  isActive('/messages') 
                    ? `${theme.bg} ${theme.text}` 
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </span>
                {unreadMessageCount > 0 && (
                  <span className="min-w-[24px] h-6 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-2">
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </span>
                )}
              </Link>

              {/* Student extras */}
              {user?.role === UserRole.STUDENT && (
                <>
                  <Link
                    to="/cart"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Receipt className="w-5 h-5" />
                    Orders
                  </Link>
                </>
              )}

              {/* Divider */}
              <div className="my-2 border-t border-gray-100" />

              {/* Dashboard & Profile */}
              <Link
                to={getDashboardLink()}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
                Profile Settings
              </Link>

              {/* Language & Logout */}
              <div className="my-2 border-t border-gray-100" />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Language</span>
                <LanguageSwitcher showLabel />
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

