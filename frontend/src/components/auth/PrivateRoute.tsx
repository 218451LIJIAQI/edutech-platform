import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { ReactNode } from 'react';

/**
 * Private Route Component
 * Protects routes that require authentication
 */
interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, user must exist and have a valid role
  if (allowedRoles) {
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
