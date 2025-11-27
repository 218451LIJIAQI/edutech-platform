import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { UserRole } from './types';

// Layout
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/auth/PrivateRoute';

// Pages
import HomePage from './pages/HomePage';
import TeacherApprovedRoute from './components/auth/TeacherApprovedRoute';
import TeacherPendingPage from './pages/teacher/TeacherPendingPage';
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
import CartPage from './pages/student/CartPage';
import CartCheckoutPage from './pages/student/CartCheckoutPage';
import OrdersPage from './pages/student/OrdersPage';
import OrderDetailPage from './pages/student/OrderDetailPage';
import LiveSessionPage from './pages/student/LiveSessionPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ManageCoursesPage from './pages/teacher/ManageCoursesPage';
import CreateCoursePage from './pages/teacher/CreateCoursePage';
import CourseManagementPage from './pages/teacher/CourseManagementPage';
import VerificationPage from './pages/teacher/VerificationPage';
import StudentsPage from './pages/teacher/StudentsPage';
import TeacherStudentManagementPage from './pages/teacher/TeacherStudentManagementPage';
import MessagesPage from './pages/messages/MessagesPage';
import ProfileCompletionPage from './pages/teacher/ProfileCompletionPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersManagement from './pages/admin/UsersManagement';
import CoursesManagement from './pages/admin/CoursesManagement';
import ReportsManagement from './pages/admin/ReportsManagement';
import FinancialsManagement from './pages/admin/FinancialsManagement';
import RefundsManagement from './pages/admin/RefundsManagement';
import SupportTicketsManagement from './pages/admin/SupportTicketsManagement';
import VerificationTeachersManagement from './pages/admin/VerificationTeachersManagement';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import HelpCenterPage from './pages/HelpCenterPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// Community (Student)
import CommunityHomePage from './pages/community/CommunityHomePage';
import CreatePostPage from './pages/community/CreatePostPage';
import PostDetailPage from './pages/community/PostDetailPage';
import CommunityUserProfilePage from './pages/community/CommunityUserProfilePage';
// Report (Student)
import StudentReportPage from './pages/student/StudentReportPage';

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
  }, [isAuthenticated, fetchProfile]);

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
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Community - Student only */}
        <Route
          path="/community"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]}>
              <CommunityHomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/community/create"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <CreatePostPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/community/post/:id"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]}>
              <PostDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/community/user/:userId"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]}>
              <CommunityUserProfilePage />
            </PrivateRoute>
          }
        />

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

        {/* Reports (Student) */}
        <Route
          path="/student/reports"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <StudentReportPage />
            </PrivateRoute>
          }
        />

        {/* Cart and Orders (Student) */}
        <Route
          path="/cart"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <CartPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/cart/checkout"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <CartCheckoutPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <OrdersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <PrivateRoute allowedRoles={[UserRole.STUDENT]}>
              <OrderDetailPage />
            </PrivateRoute>
          }
        />

        {/* Protected Teacher routes */}
        <Route
          path="/teacher/pending"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <TeacherPendingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <TeacherApprovedRoute>
                <TeacherDashboard />
              </TeacherApprovedRoute>
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
          path="/teacher/courses/:courseId/manage"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <CourseManagementPage />
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
        <Route
          path="/teacher/students-management"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <TeacherStudentManagementPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/profile-completion"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <ProfileCompletionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />

        {/* Protected Common routes */}
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <MessagesPage />
            </PrivateRoute>
          }
        />
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
        <Route
          path="/admin/refunds"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <RefundsManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <SupportTicketsManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/financials"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <FinancialsManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/verification-teachers"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <VerificationTeachersManagement />
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

