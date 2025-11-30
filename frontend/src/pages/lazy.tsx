/**
 * Lazy-loaded page components for code splitting
 * This file exports all pages wrapped with React.lazy() for route-based code splitting
 */
import { lazy } from 'react';

// ================================
// Public Pages
// ================================
export const HomePage = lazy(() => import('./HomePage'));
export const CoursesPage = lazy(() => import('./courses/CoursesPage'));
export const CourseDetailPage = lazy(() => import('./courses/CourseDetailPage'));
export const TeachersPage = lazy(() => import('./teachers/TeachersPage'));
export const TeacherProfilePage = lazy(() => import('./teachers/TeacherProfilePage'));
export const HelpCenterPage = lazy(() => import('./HelpCenterPage'));
export const TermsOfServicePage = lazy(() => import('./TermsOfServicePage'));
export const PrivacyPolicyPage = lazy(() => import('./PrivacyPolicyPage'));
export const NotFoundPage = lazy(() => import('./NotFoundPage'));

// ================================
// Auth Pages
// ================================
export const LoginPage = lazy(() => import('./auth/LoginPage'));
export const RegisterPage = lazy(() => import('./auth/RegisterPage'));
export const ForgotPasswordPage = lazy(() => import('./auth/ForgotPasswordPage'));

// ================================
// Student Pages
// ================================
export const StudentDashboard = lazy(() => import('./student/StudentDashboard'));
export const MyCoursesPage = lazy(() => import('./student/MyCoursesPage'));
export const CourseLearningPage = lazy(() => import('./student/CourseLearningPage'));
export const CheckoutPage = lazy(() => import('./student/CheckoutPage'));
export const ReviewCoursePage = lazy(() => import('./student/ReviewCoursePage'));
export const CartPage = lazy(() => import('./student/CartPage'));
export const CartCheckoutPage = lazy(() => import('./student/CartCheckoutPage'));
export const OrdersPage = lazy(() => import('./student/OrdersPage'));
export const OrderDetailPage = lazy(() => import('./student/OrderDetailPage'));
export const LiveSessionPage = lazy(() => import('./student/LiveSessionPage'));
export const StudentReportPage = lazy(() => import('./student/StudentReportPage'));

// ================================
// Teacher Pages
// ================================
export const TeacherDashboard = lazy(() => import('./teacher/TeacherDashboard'));
export const TeacherPendingPage = lazy(() => import('./teacher/TeacherPendingPage'));
export const ManageCoursesPage = lazy(() => import('./teacher/ManageCoursesPage'));
export const CreateCoursePage = lazy(() => import('./teacher/CreateCoursePage'));
export const CourseManagementPage = lazy(() => import('./teacher/CourseManagementPage'));
export const VerificationPage = lazy(() => import('./teacher/VerificationPage'));
export const StudentsPage = lazy(() => import('./teacher/StudentsPage'));
export const WalletPage = lazy(() => import('./teacher/WalletPage'));
export const TeacherStudentManagementPage = lazy(() => import('./teacher/TeacherStudentManagementPage'));
export const ProfileCompletionPage = lazy(() => import('./teacher/ProfileCompletionPage'));

// ================================
// Admin Pages
// ================================
export const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
export const UsersManagement = lazy(() => import('./admin/UsersManagement'));
export const CoursesManagement = lazy(() => import('./admin/CoursesManagement'));
export const ReportsManagement = lazy(() => import('./admin/ReportsManagement'));
export const FinancialsManagement = lazy(() => import('./admin/FinancialsManagement'));
export const RefundsManagement = lazy(() => import('./admin/RefundsManagement'));
export const SupportTicketsManagement = lazy(() => import('./admin/SupportTicketsManagement'));
export const VerificationTeachersManagement = lazy(() => import('./admin/VerificationTeachersManagement'));

// ================================
// Common Pages
// ================================
export const ProfilePage = lazy(() => import('./ProfilePage'));
export const MessagesPage = lazy(() => import('./messages/MessagesPage'));

// ================================
// Community Pages
// ================================
export const CommunityHomePage = lazy(() => import('./community/CommunityHomePage'));
export const CreatePostPage = lazy(() => import('./community/CreatePostPage'));
export const PostDetailPage = lazy(() => import('./community/PostDetailPage'));
export const CommunityUserProfilePage = lazy(() => import('./community/CommunityUserProfilePage'));
