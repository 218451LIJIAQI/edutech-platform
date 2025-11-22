import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { UserRole } from './types';

// Layout
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/auth/PrivateRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CoursesPage from './pages/courses/CoursesPage';
import CourseDetailPage from './pages/courses/CourseDetailPage';
import TeachersPage from './pages/teachers/TeachersPage';
import TeacherProfilePage from './pages/teachers/TeacherProfilePage';
import StudentDashboard from './pages/student/StudentDashboard';
import MyCoursesPage from './pages/student/MyCoursesPage';
import CourseLearningPage from './pages/student/CourseLearningPage';
import CheckoutPage from './pages/student/CheckoutPage';
import ReviewCoursePage from './pages/student/ReviewCoursePage';
import LiveSessionPage from './pages/student/LiveSessionPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ManageCoursesPage from './pages/teacher/ManageCoursesPage';
import CreateCoursePage from './pages/teacher/CreateCoursePage';
import VerificationPage from './pages/teacher/VerificationPage';
import StudentsPage from './pages/teacher/StudentsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import CoursesManagement from './pages/admin/CoursesManagement';
import ReportsManagement from './pages/admin/ReportsManagement';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Main App Component
 * Handles routing and authentication initialization
 */
function App() {
  const { isAuthenticated, fetchProfile } = useAuthStore();

  // Initialize authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !isAuthenticated) {
        try {
          await fetchProfile();
        } catch (error) {
          console.error('Failed to fetch profile:', error);
        }
      }
    };

    initAuth();
  }, []);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/teachers/:id" element={<TeacherProfilePage />} />

        {/* Protected Student routes */}
        <Route
          path="/student"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/courses"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <MyCoursesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:courseId/learn"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <CourseLearningPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:courseId/checkout/:packageId"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <CheckoutPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:courseId/review"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <ReviewCoursePage />
            </PrivateRoute>
          }
        />

        {/* Protected Teacher routes */}
        <Route
          path="/teacher"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/courses"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <ManageCoursesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/courses/new"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <CreateCoursePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/courses/:courseId/edit"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <CreateCoursePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/verification"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <VerificationPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <StudentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/students/:courseId"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <StudentsPage />
            </PrivateRoute>
          }
        />

        {/* Protected Common routes */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />

        {/* Live Session */}
        <Route
          path="/live/:sessionId"
          element={
            <PrivateRoute>
              <LiveSessionPage />
            </PrivateRoute>
          }
        />

        {/* Protected Admin routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <UsersManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <CoursesManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <ReportsManagement />
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}

export default App;

