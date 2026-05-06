import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PageLoader from '@/components/common/PageLoader';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';
import { normalizeTeacherProfileCompletionStatus } from '@/utils/teacher-profile';

/**
 * TeacherApprovedRoute protects teacher-only pages that require
 * an approved teacher registration status.
 *
 * This component should normally be used inside PrivateRoute with
 * allowedRoles={[UserRole.TEACHER]}.
 */
interface TeacherApprovedRouteProps {
  children: ReactNode;
}

const TeacherApprovedRoute = ({ children }: TeacherApprovedRouteProps) => {
  const location = useLocation();
  const { user, isProfileHydrating } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== UserRole.TEACHER) {
    return <>{children}</>;
  }

  if (isProfileHydrating) {
    return <PageLoader message="Restoring teacher profile..." />;
  }

  if (!user.teacherProfile) {
    return <Navigate to="/teacher/profile-completion" replace />;
  }

  if (user.teacherProfile.registrationStatus !== 'APPROVED') {
    return <Navigate to="/teacher/pending" replace />;
  }

  if (normalizeTeacherProfileCompletionStatus(user.teacherProfile.profileCompletionStatus) !== 'APPROVED') {
    return <Navigate to="/teacher/profile-completion" replace />;
  }

  return <>{children}</>;
};

export default TeacherApprovedRoute;
