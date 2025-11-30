import { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { UserRole } from './types';

// Layout
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/auth/PrivateRoute';
import TeacherApprovedRoute from './components/auth/TeacherApprovedRoute';
import PageLoader from './components/common/PageLoader';

// Lazy-loaded Pages (Code Splitting)
import {
  // Public
  HomePage,
  CoursesPage,
  CourseDetailPage,
  TeachersPage,
  TeacherProfilePage,
  HelpCenterPage,
  TermsOfServicePage,
  PrivacyPolicyPage,
  NotFoundPage,
  // Auth
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  // Student
  StudentDashboard,
  MyCoursesPage,
  CourseLearningPage,
  CheckoutPage,
  ReviewCoursePage,
  CartPage,
  CartCheckoutPage,
  OrdersPage,
  OrderDetailPage,
  LiveSessionPage,
  StudentReportPage,
  // Teacher
  TeacherDashboard,
  TeacherPendingPage,
  ManageCoursesPage,
  CreateCoursePage,
  CourseManagementPage,
  VerificationPage,
  StudentsPage,
  WalletPage,
  TeacherStudentManagementPage,
  ProfileCompletionPage,
  // Admin
  AdminDashboard,
  UsersManagement,
  CoursesManagement,
  ReportsManagement,
  FinancialsManagement,
  RefundsManagement,
  SupportTicketsManagement,
  VerificationTeachersManagement,
  // Common
  ProfilePage,
  MessagesPage,
  // Community
  CommunityHomePage,
  CreatePostPage,
  PostDetailPage,
  CommunityUserProfilePage,
} from './pages/lazy';

/**
 * Main App Component
 * Handles routing and authentication initialization
 */
function App() {
  const { isAuthenticated, fetchProfile } = useAuthStore();

  // Initialize authentication on app load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !isAuthenticated && isMounted) {
        try {
          await fetchProfile();
        } catch (error) {
          if (isMounted) {
            console.error('Failed to fetch profile:', error);
          }
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, fetchProfile]);

  return (
    <Suspense fallback={<PageLoader message="Loading page..." />}>
      <Routes>
        <Route element={<MainLayout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        <Route
          path="/teacher/wallet"
          element={
            <PrivateRoute allowedRoles={[UserRole.TEACHER]}>
              <WalletPage />
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
    </Suspense>
  );
}

export default App;

