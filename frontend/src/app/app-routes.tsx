import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import PrivateRoute from '@/components/auth/PrivateRoute';
import TeacherApprovedRoute from '@/components/auth/TeacherApprovedRoute';
import MainLayout from '@/components/layout/MainLayout';
import { UserRole } from '@/types';

import {
  AdminDashboard,
  AdsManagement,
  CartCheckoutPage,
  CartPage,
  CheckoutPage,
  CommunityHomePage,
  CommunityUserProfilePage,
  CourseDetailPage,
  CourseLearningPage,
  CourseManagementPage,
  CoursesManagement,
  CoursesPage,
  CreateCoursePage,
  CreatePostPage,
  FinancialsManagement,
  ForgotPasswordPage,
  HelpCenterPage,
  HomePage,
  LiveSessionPage,
  LoginPage,
  ManageCoursesPage,
  MessagesPage,
  MyCoursesPage,
  NotFoundPage,
  OrderDetailPage,
  OrdersPage,
  PostDetailPage,
  PrivacyPolicyPage,
  ProfileCompletionPage,
  ProfilePage,
  RefundsManagement,
  RegisterPage,
  ReportsManagement,
  ReviewCoursePage,
  StudentDashboard,
  StudentReportPage,
  StudentsPage,
  SupportTicketsManagement,
  TeacherDashboard,
  TeacherPendingPage,
  TeacherProfilePage,
  TeachersPage,
  TeacherStudentManagementPage,
  TermsOfServicePage,
  UsersManagement,
  VerificationPage,
  VerificationTeachersManagement,
  WalletPage,
} from '@/pages/lazy-pages';

interface AppRouteDefinition {
  path: string;
  element: ReactNode;
}

const studentRoles: UserRole[] = [UserRole.STUDENT];
const teacherRoles: UserRole[] = [UserRole.TEACHER];
const adminRoles: UserRole[] = [UserRole.ADMIN];
const authenticatedRoles: UserRole[] = [
  UserRole.STUDENT,
  UserRole.TEACHER,
  UserRole.ADMIN,
];

const protectRoute = (element: ReactNode, allowedRoles?: UserRole[]) => (
  <PrivateRoute allowedRoles={allowedRoles}>{element}</PrivateRoute>
);

const protectApprovedTeacherRoute = (element: ReactNode) =>
  protectRoute(<TeacherApprovedRoute>{element}</TeacherApprovedRoute>, teacherRoles);

const renderRouteGroup = (routes: AppRouteDefinition[]) =>
  routes.map(({ path, element }) => (
    <Route key={path} path={path} element={element} />
  ));

const publicRoutes: AppRouteDefinition[] = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/courses', element: <CoursesPage /> },
  { path: '/courses/:id', element: <CourseDetailPage /> },
  { path: '/teachers', element: <TeachersPage /> },
  { path: '/teachers/:id', element: <TeacherProfilePage /> },
  { path: '/help', element: <HelpCenterPage /> },
  { path: '/terms', element: <TermsOfServicePage /> },
  { path: '/privacy', element: <PrivacyPolicyPage /> },
];

const communityRoutes: AppRouteDefinition[] = [
  {
    path: '/community',
    element: protectRoute(<CommunityHomePage />, authenticatedRoles),
  },
  {
    path: '/community/create',
    element: protectRoute(<CreatePostPage />, authenticatedRoles),
  },
  {
    path: '/community/post/:id',
    element: protectRoute(<PostDetailPage />, authenticatedRoles),
  },
  {
    path: '/community/user/:userId',
    element: protectRoute(<CommunityUserProfilePage />, authenticatedRoles),
  },
];

const studentRoutes: AppRouteDefinition[] = [
  {
    path: '/student',
    element: protectRoute(<StudentDashboard />, studentRoles),
  },
  {
    path: '/student/courses',
    element: protectRoute(<MyCoursesPage />, studentRoles),
  },
  {
    path: '/courses/:courseId/learn',
    element: protectRoute(<CourseLearningPage />, studentRoles),
  },
  {
    path: '/courses/:courseId/checkout/:packageId',
    element: protectRoute(<CheckoutPage />, studentRoles),
  },
  {
    path: '/courses/:courseId/review',
    element: protectRoute(<ReviewCoursePage />, studentRoles),
  },
  {
    path: '/student/reports',
    element: protectRoute(<StudentReportPage />, studentRoles),
  },
  {
    path: '/cart',
    element: protectRoute(<CartPage />, studentRoles),
  },
  {
    path: '/cart/checkout',
    element: protectRoute(<CartCheckoutPage />, studentRoles),
  },
  {
    path: '/orders',
    element: protectRoute(<OrdersPage />, studentRoles),
  },
  {
    path: '/orders/:id',
    element: protectRoute(<OrderDetailPage />, studentRoles),
  },
];

const teacherRoutes: AppRouteDefinition[] = [
  {
    path: '/teacher/pending',
    element: protectRoute(<TeacherPendingPage />, teacherRoles),
  },
  {
    path: '/teacher/verification',
    element: protectRoute(<VerificationPage />, teacherRoles),
  },
  {
    path: '/teacher/profile-completion',
    element: protectRoute(<ProfileCompletionPage />, teacherRoles),
  },
  {
    path: '/teacher',
    element: protectApprovedTeacherRoute(<TeacherDashboard />),
  },
  {
    path: '/teacher/dashboard',
    element: protectApprovedTeacherRoute(<TeacherDashboard />),
  },
  {
    path: '/teacher/courses',
    element: protectApprovedTeacherRoute(<ManageCoursesPage />),
  },
  {
    path: '/teacher/courses/new',
    element: protectApprovedTeacherRoute(<CreateCoursePage />),
  },
  {
    path: '/teacher/courses/:courseId/edit',
    element: protectApprovedTeacherRoute(<CreateCoursePage />),
  },
  {
    path: '/teacher/courses/:courseId/manage',
    element: protectApprovedTeacherRoute(<CourseManagementPage />),
  },
  {
    path: '/teacher/students',
    element: protectApprovedTeacherRoute(<StudentsPage />),
  },
  {
    path: '/teacher/students/:courseId',
    element: protectApprovedTeacherRoute(<StudentsPage />),
  },
  {
    path: '/teacher/students-management',
    element: protectApprovedTeacherRoute(<TeacherStudentManagementPage />),
  },
  {
    path: '/teacher/wallet',
    element: protectApprovedTeacherRoute(<WalletPage />),
  },
];

const commonProtectedRoutes: AppRouteDefinition[] = [
  {
    path: '/messages',
    element: protectRoute(<MessagesPage />),
  },
  {
    path: '/profile',
    element: protectRoute(<ProfilePage />),
  },
  {
    path: '/live/:sessionId',
    element: protectRoute(<LiveSessionPage />),
  },
];

const adminRoutes: AppRouteDefinition[] = [
  {
    path: '/admin',
    element: protectRoute(<AdminDashboard />, adminRoles),
  },
  {
    path: '/admin/ads',
    element: protectRoute(<AdsManagement />, adminRoles),
  },
  {
    path: '/admin/users',
    element: protectRoute(<UsersManagement />, adminRoles),
  },
  {
    path: '/admin/courses',
    element: protectRoute(<CoursesManagement />, adminRoles),
  },
  {
    path: '/admin/reports',
    element: protectRoute(<ReportsManagement />, adminRoles),
  },
  {
    path: '/admin/refunds',
    element: protectRoute(<RefundsManagement />, adminRoles),
  },
  {
    path: '/admin/support',
    element: protectRoute(<SupportTicketsManagement />, adminRoles),
  },
  {
    path: '/admin/financials',
    element: protectRoute(<FinancialsManagement />, adminRoles),
  },
  {
    path: '/admin/verification-teachers',
    element: protectRoute(<VerificationTeachersManagement />, adminRoles),
  },
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {renderRouteGroup(publicRoutes)}
        {renderRouteGroup(communityRoutes)}
        {renderRouteGroup(studentRoutes)}
        {renderRouteGroup(teacherRoutes)}
        {renderRouteGroup(commonProtectedRoutes)}
        {renderRouteGroup(adminRoutes)}

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}