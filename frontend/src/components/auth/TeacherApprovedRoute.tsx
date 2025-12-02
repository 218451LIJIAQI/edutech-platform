import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { ReactNode } from 'react';

/**
 * Teacher Approved Route
 * Blocks teacher-only pages until admin approves registration
 */
interface TeacherApprovedRouteProps {
  children: ReactNode;
}

const TeacherApprovedRoute = ({ children }: TeacherApprovedRouteProps) => {
  const { user } = useAuthStore();

  // If user is not a teacher, allow access (defensive check)
  // In practice, this component is wrapped in PrivateRoute with teacher role check
  if (!user || user.role !== UserRole.TEACHER) {
    return children;
  }

  // Check if teacher registration is approved
  const registrationStatus = user.teacherProfile?.registrationStatus;
  if (registrationStatus && registrationStatus !== 'APPROVED') {
    return <Navigate to="/teacher/pending" replace />;
  }

  return children;
};

export default TeacherApprovedRoute;
