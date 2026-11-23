import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Sparkles,
  MessageSquare,
  Users,
  Wallet,
  BarChart3,
  Shield,
  UserCheck,
  DollarSign,
  Settings,
  Compass,
  HelpCircle,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

import NotificationCenter from '../common/NotificationCenter';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';
import messageService from '@/services/message.service';
import clientLogger from '@/utils/logger';
import { getAccessToken, hasRecoverableAuthState } from '@/utils/auth-storage';
import { normalizeTeacherProfileCompletionStatus } from '@/utils/teacher-profile';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
  exact?: boolean;
};

/**
 * Navbar
 *
 * Desktop web navigation bar with role-based menu items, unread message indicator,
 * window-resize/zoom wrapping elasticity, and keyboard accessibility.
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const hasAccessToken = Boolean(getAccessToken());
  const hasRecoverableSession = hasRecoverableAuthState();
  const isSessionReady = Boolean(isAuthenticated && user);
  const shouldShowSessionRestoreState = hasRecoverableSession && (!hasAccessToken || !user);

  const theme = useMemo(() => {
    switch (user?.role) {
      case UserRole.TEACHER:
        return {
          gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
          shadow: 'shadow-emerald-500/20',
          hoverShadow: 'hover:shadow-emerald-500/30',
          bg: 'bg-emerald-50',
          text: 'text-emerald-600',
          badge: 'Teacher',
        };

      case UserRole.ADMIN:
        return {
          gradient: 'from-violet-500 via-violet-600 to-purple-600',
          shadow: 'shadow-violet-500/20',
          hoverShadow: 'hover:shadow-violet-500/30',
          bg: 'bg-violet-50',
          text: 'text-violet-600',
          badge: 'Admin',
        };

      default:
        return {
          gradient: 'from-primary-500 via-primary-600 to-indigo-600',
          shadow: 'shadow-primary-500/20',
          hoverShadow: 'hover:shadow-primary-500/30',
          bg: 'bg-primary-50',
          text: 'text-primary-600',
          badge: 'Student',
        };
    }
  }, [user?.role]);

  const userInitial =
    user?.firstName?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    'U';

  const teacherRegistrationStatus = user?.teacherProfile?.registrationStatus;
  const teacherProfileCompletionStatus = normalizeTeacherProfileCompletionStatus(
    user?.teacherProfile?.profileCompletionStatus
  );
  const isApprovedTeacher =
    user?.role === UserRole.TEACHER &&
    teacherRegistrationStatus === 'APPROVED' &&
    teacherProfileCompletionStatus === 'APPROVED';

  const navItems = useMemo<NavItem[]>(() => {
    if (shouldShowSessionRestoreState) {
      return [];
    }

    if (user?.role === UserRole.STUDENT) {
      return [
        { to: '/courses', label: 'Explore', icon: Compass },
        { to: '/student/courses', label: 'My Courses', icon: BookOpen },
        { to: '/teachers', label: 'Teachers', icon: Users },
        { to: '/community', label: 'Community', icon: MessageSquare },
        { to: '/student/reports', label: 'Reports', icon: BarChart3 },
      ];
    }

    if (user?.role === UserRole.TEACHER) {
      if (!isApprovedTeacher) {
        return [
          {
            to:
              teacherRegistrationStatus === 'APPROVED'
                ? '/teacher/profile-completion'
                : '/teacher/pending',
            label: teacherRegistrationStatus === 'APPROVED' ? 'Profile' : 'Status',
            icon: teacherRegistrationStatus === 'APPROVED' ? Settings : UserCheck,
          },
          { to: '/teacher/verification', label: 'Verification', icon: Shield },
        ];
      }

      return [
        { to: '/teacher/courses', label: 'Courses', icon: BookOpen },
        { to: '/teacher/courses/new', label: 'Create', icon: Sparkles, highlight: true },
        { to: '/teacher/students-management', label: 'Students', icon: Users },
        { to: '/teacher/wallet', label: 'Earnings', icon: Wallet },
      ];
    }

    if (user?.role === UserRole.ADMIN) {
      return [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/ads', label: 'Ads', icon: Megaphone },
        { to: '/admin/financials', label: 'Finance', icon: DollarSign },
        { to: '/admin/verification-teachers', label: 'Verify', icon: UserCheck },
      ];
    }

    return [
      { to: '/courses', label: 'Courses', icon: BookOpen },
      { to: '/teachers', label: 'Teachers', icon: Users },
      { to: '/help', label: 'Help', icon: HelpCircle },
    ];
  }, [isApprovedTeacher, shouldShowSessionRestoreState, teacherRegistrationStatus, user?.role]);

  const getDashboardLink = useCallback(() => {
    switch (user?.role) {
      case UserRole.STUDENT:
        return '/student';
      case UserRole.TEACHER:
        if (isApprovedTeacher) {
          return '/teacher';
        }

        return teacherRegistrationStatus === 'APPROVED'
          ? '/teacher/profile-completion'
          : '/teacher/pending';
      case UserRole.ADMIN:
        return '/admin';
      default:
        return '/';
    }
  }, [isApprovedTeacher, teacherRegistrationStatus, user?.role]);

  const isActive = useCallback(
    (path: string, exact = false) => {
      if (exact) {
        return location.pathname === path;
      }
      if (path === '/teacher/courses' && location.pathname === '/teacher/courses/new') {
        return false;
      }
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const fetchUnreadMessageCount = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadMessageCount(Math.max(0, count));
    } catch (error) {
      clientLogger.error('Failed to fetch unread message count:', error);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isSessionReady) {
      setUnreadMessageCount(0);
      return;
    }

    void fetchUnreadMessageCount();

    const interval = window.setInterval(fetchUnreadMessageCount, 30000);

    const handleUnreadUpdate = () => {
      void fetchUnreadMessageCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchUnreadMessageCount();
      }
    };

    window.addEventListener('messages:unread-updated', handleUnreadUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('messages:unread-updated', handleUnreadUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSessionReady, fetchUnreadMessageCount]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      clientLogger.error('Logout failed:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return (
    <nav
      aria-label="Main navigation"
      className={clsx(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100/50'
          : 'bg-white/80 backdrop-blur-lg border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          {/* Logo */}
          <Link to="/" aria-label="Go to home page" className="flex items-center gap-3 group shrink-0">
            <div
              className={clsx(
                'relative p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-105',
                `bg-gradient-to-br ${theme.gradient} ${theme.shadow} group-hover:shadow-xl ${theme.hoverShadow}`
              )}
            >
              <BookOpen className="h-5 w-5 text-white" aria-hidden="true" />
            </div>

            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-xl font-bold text-transparent">
                Edutech
              </span>

              {isSessionReady && (
                <span className={clsx('text-[10px] font-semibold uppercase', theme.text)}>
                  {theme.badge} Portal
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation (wraps cleanly under narrower desktop windows or browser zoom) */}
          {navItems.length > 0 && (
            <div className="flex items-center">
              <div
                className={clsx(
                  'flex flex-wrap items-center gap-1 rounded-2xl p-1',
                  isSessionReady ? 'bg-gray-100/80' : ''
                )}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to, item.exact);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap',
                        active
                          ? `bg-white shadow-sm ${theme.text}`
                          : 'text-gray-600 hover:bg-white/60 hover:text-gray-900',
                        item.highlight && !active && `${theme.text} font-semibold`
                      )}
                    >
                      <Icon className={clsx('h-4 w-4', item.highlight && 'animate-pulse')} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-1 shrink-0">
            {shouldShowSessionRestoreState ? (
              <div className="flex items-center gap-3 pl-3">
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                >
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary-500" />
                  <span>Restoring session...</span>
                </div>
              </div>
            ) : isSessionReady ? (
              <>
                <Link
                  to="/messages"
                  aria-label={
                    unreadMessageCount > 0
                      ? `Messages, ${unreadMessageCount > 99 ? '99 plus' : unreadMessageCount} unread`
                      : 'Messages'
                  }
                  className={clsx(
                    'relative rounded-xl p-2 transition-all duration-200',
                    isActive('/messages')
                      ? `${theme.bg} ${theme.text}`
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  )}
                >
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />

                  {unreadMessageCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Link>

                <NotificationCenter />

                {user?.role === UserRole.STUDENT && (
                  <div className="ml-1 flex items-center gap-1 border-l border-gray-200 pl-2">
                    <Link
                      to="/cart"
                      aria-label="Cart"
                      className={clsx(
                        'rounded-xl p-2 transition-all duration-200',
                        isActive('/cart')
                          ? `${theme.bg} ${theme.text}`
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      )}
                    >
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    </Link>

                    <Link
                      to="/orders"
                      aria-label="Orders"
                      className={clsx(
                        'rounded-xl p-2 transition-all duration-200',
                        isActive('/orders')
                          ? `${theme.bg} ${theme.text}`
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      )}
                    >
                      <Receipt className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  </div>
                )}

                <div className="ml-2 flex items-center gap-1 border-l border-gray-200 pl-2">
                  <Link
                    to={getDashboardLink()}
                    aria-label="Dashboard"
                    className="flex rounded-xl p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                    title="Dashboard"
                  >
                    <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                  </Link>

                  <Link
                    to="/profile"
                    aria-label="Profile settings"
                    className="flex items-center gap-2 rounded-xl p-1.5 pr-3 transition-all duration-200 hover:bg-gray-100"
                  >
                    <div
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-white',
                        `bg-gradient-to-br ${theme.gradient}`
                      )}
                      aria-hidden="true"
                    >
                      {userInitial}
                    </div>

                    <span className="hidden text-sm font-medium text-gray-700 lg:block">
                      {user?.firstName || 'Profile'}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Logout"
                    className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-primary-600"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
