import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ReactNode } from 'react';

/**
 * Teacher Approved Route
 * Blocks teacher-only pages until admin approves registration
 */
interface Props {
  children: ReactNode;
}

const TeacherApprovedRoute = ({ children }: Props) => {
  const { user } = useAuthStore();

  if (user?.role !== 'TEACHER') return <>{children}</>;

  const status = user.teacherProfile?.registrationStatus;
  if (status && status !== 'APPROVED') {
    return <Navigate to="/teacher/pending" replace />;
  }

  return <>{children}</>;
};

export default TeacherApprovedRoute;

