/**
 * TypeScript interfaces and types for the Edutech Platform frontend
 */

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum LessonType {
  LIVE = 'LIVE',
  RECORDED = 'RECORDED',
  HYBRID = 'HYBRID',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum ReportType {
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  FRAUD = 'FRAUD',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacherProfile?: TeacherProfile;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  bio?: string;
  headline?: string;
  hourlyRate?: number;
  totalStudents: number;
  averageRating: number;
  totalEarnings: number;
  isVerified: boolean;
  user?: User;
  certifications?: Certification[];
}

export interface Certification {
  id: string;
  teacherProfileId: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Course {
  id: string;
  teacherProfileId: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  previewVideoUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  teacherProfile?: TeacherProfile;
  lessons?: Lesson[];
  packages?: LessonPackage[];
  materials?: Material[];
  isEnrolled?: boolean;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: LessonType;
  duration?: number;
  videoUrl?: string;
  orderIndex: number;
  isFree: boolean;
}

export interface LessonPackage {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  finalPrice: number;
  duration?: number;
  maxStudents?: number;
  features?: string[];
  isActive: boolean;
}

export interface Enrollment {
  id: string;
  userId: string;
  packageId: string;
  enrolledAt: string;
  expiresAt?: string;
  progress: number;
  completedLessons: number;
  isActive: boolean;
  package?: LessonPackage & { course?: Course };
}

export interface Payment {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  platformCommission: number;
  teacherEarning: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  enrollmentId: string;
  reviewerId: string;
  teacherId: string;
  rating: number;
  comment?: string;
  isPublished: boolean;
  createdAt: string;
  reviewer?: User;
  enrollment?: Enrollment;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  reporter?: User;
  reported?: User;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDownloadable: boolean;
  uploadedAt: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: {
    items?: T[];
    teachers?: T[];
    courses?: T[];
    reviews?: T[];
    reports?: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Teacher Statistics
export interface TeacherStats {
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  averageRating: number;
  totalStudents: number;
  isVerified: boolean;
}

// Verification Document
export interface TeacherVerification {
  id: string;
  teacherProfileId: string;
  documentType: string;
  documentUrl: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

// Payment with expanded details
export interface PaymentWithDetails extends Payment {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  package?: {
    name: string;
    course?: {
      title: string;
    };
  };
}

