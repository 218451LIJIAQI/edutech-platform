import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PageLoader from '@/components/common/PageLoader';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';
import { getAccessToken, hasRecoverableAuthState } from '@/utils/auth-storage';

/**
 * PrivateRoute protects routes that require authentication.
 * It also supports optional role-based access control.
 */
interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const hasAccessToken = Boolean(getAccessToken());
  const hasRecoverableSession = hasRecoverableAuthState();

  const isRestoringSession =
    hasRecoverableSession && (!hasAccessToken || !isAuthenticated || !user);

  if (isRestoringSession) {
    return <PageLoader message="Restoring your session..." />;
  }

  if (!hasAccessToken || !isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;