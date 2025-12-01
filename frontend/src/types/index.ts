/**
 * TypeScript interfaces and types for the Edutech Platform frontend
 */

/** User role enumeration for access control */
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

/** Course delivery type enumeration */
export enum CourseType {
  LIVE = 'LIVE',       // Online live sessions
  RECORDED = 'RECORDED', // Pre-recorded video courses
  HYBRID = 'HYBRID',     // Mix of live and recorded
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

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  PROCESSING = 'PROCESSING',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  WALLET = 'WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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

/** User account information */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly avatar?: string;
  readonly isActive: boolean;
  readonly isLocked?: boolean;
  readonly phone?: string;
  readonly address?: string;
  readonly department?: string;
  readonly lastLoginAt?: string;
  readonly loginCount?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly teacherProfile?: TeacherProfile;
}

/** Teacher profile information and verification status */
export interface TeacherProfile {
  readonly id: string;
  readonly userId: string;
  readonly createdAt?: string;
  readonly bio?: string;
  readonly headline?: string;
  readonly hourlyRate?: number;
  readonly totalStudents: number;
  readonly averageRating: number;
  readonly totalEarnings: number;
  readonly commissionRate?: number; // percent override for platform commission
  readonly isVerified: boolean;
  readonly verificationStatus?: VerificationStatus;
  readonly registrationStatus?: RegistrationStatus;
  
  // Extended Profile Fields
  readonly selfIntroduction?: string;
  readonly educationBackground?: string;
  readonly teachingExperience?: string;
  readonly awards?: string[] | string; // JSON array or string
  readonly specialties?: string[] | string; // JSON array or string
  readonly teachingStyle?: string;
  readonly languages?: string[] | string; // JSON array or string
  readonly yearsOfExperience?: number;
  readonly profilePhoto?: string;
  readonly certificatePhotos?: string[] | string; // JSON array or string
  
  // Profile Completion Status
  readonly profileCompletionStatus?: string; // INCOMPLETE, PENDING_REVIEW, APPROVED, REJECTED
  readonly profileSubmittedAt?: string;
  readonly profileReviewedAt?: string;
  readonly profileReviewNotes?: string;
  
  readonly user?: User;
  readonly certifications?: Certification[];
}

/** Teacher certification information */
export interface Certification {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly title: string;
  readonly issuer: string;
  readonly issueDate: string;
  readonly expiryDate?: string;
  readonly credentialId?: string;
  readonly credentialUrl?: string;
}

/** Course information with lessons and packages */
export interface Course {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly courseType: CourseType; // LIVE, RECORDED, or HYBRID
  readonly thumbnail?: string;
  readonly previewVideoUrl?: string;
  readonly isPublished: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly teacherProfile?: TeacherProfile;
  readonly lessons?: Lesson[];
  readonly packages?: LessonPackage[];
  readonly materials?: Material[];
  readonly isEnrolled?: boolean;
}

/** Individual lesson within a course */
export interface Lesson {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly type: LessonType;
  readonly duration?: number;
  readonly videoUrl?: string;
  readonly orderIndex: number;
  readonly isFree: boolean;
}

/** Lesson package with pricing and features */
export interface LessonPackage {
  readonly id: string;
  readonly courseId: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly discount?: number;
  readonly finalPrice: number;
  readonly duration?: number;
  readonly maxStudents?: number;
  readonly features?: string[];
  readonly isActive: boolean;
}

/** Student enrollment in a course package */
export interface Enrollment {
  readonly id: string;
  readonly userId: string;
  readonly packageId: string;
  readonly enrolledAt: string;
  readonly expiresAt?: string;
  readonly progress: number;
  readonly completedLessons: number;
  readonly isActive: boolean;
  readonly package?: LessonPackage & { course?: Course };
}

/** Payment transaction record */
export interface Payment {
  readonly id: string;
  readonly userId: string;
  readonly packageId?: string; // optional for order payments
  readonly amount: number;
  readonly platformCommission: number;
  readonly teacherEarning: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly paidAt?: string;
  readonly createdAt: string;
}

// Cart
/** Shopping cart item */
export interface CartItem {
  readonly id: string;
  readonly userId: string;
  readonly packageId: string;
  readonly quantity: number;
  readonly addedAt: string;
  readonly package?: LessonPackage & { course?: Course };
}

/** Shopping cart summary */
export interface CartSummary {
  readonly items: CartItem[];
  readonly totalAmount: number;
  readonly currency: string;
}

// Orders
/** Individual item in an order */
export interface OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly packageId: string;
  readonly price: number;
  readonly discount?: number;
  readonly finalPrice: number;
  readonly package?: LessonPackage & { course?: Course };
}

/** Customer order */
export interface Order {
  readonly id: string;
  readonly orderNo: string;
  readonly userId: string;
  readonly status: OrderStatus;
  readonly totalAmount: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly paidAt?: string;
  readonly canceledAt?: string;
  readonly cancelReason?: string;
  readonly refundedAt?: string;
  readonly refundAmount?: number;
  readonly refundReason?: string;
  readonly items?: OrderItem[];
}

/** Refund request and processing */
export interface Refund {
  readonly id: string;
  readonly orderId: string;
  readonly amount: number;
  readonly reason?: string;
  readonly reasonCategory?: string;
  readonly status: RefundStatus;
  readonly refundMethod: RefundMethod;
  readonly bankDetails?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly processedAt?: string;
  readonly completedAt?: string;
  // Expanded details for admin views
  readonly order?: Order & { user?: User };
}

/** Support ticket message */
export interface SupportTicketMessage {
  readonly id: string;
  readonly ticketId: string;
  readonly senderId: string;
  readonly message: string;
  readonly attachment?: string;
  readonly createdAt: string;
  readonly sender?: User;
}

/** Support ticket for customer issues */
export interface SupportTicket {
  readonly id: string;
  readonly ticketNo: string;
  readonly userId: string;
  readonly orderId?: string;
  readonly subject: string;
  readonly description: string;
  readonly category: string;
  readonly priority: SupportTicketPriority;
  readonly status: SupportTicketStatus;
  readonly assignedTo?: string;
  readonly resolution?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly messages?: SupportTicketMessage[];
  readonly user?: User;
}

/** Course review from student */
export interface Review {
  readonly id: string;
  readonly enrollmentId: string;
  readonly reviewerId: string;
  readonly teacherId: string;
  readonly rating: number;
  readonly comment?: string;
  readonly isPublished: boolean;
  readonly createdAt: string;
  readonly reviewer?: User;
  readonly enrollment?: Enrollment;
}

/** User report for inappropriate content or issues */
export interface Report {
  readonly id: string;
  readonly reporterId: string;
  readonly reportedId: string;
  readonly type: ReportType;
  readonly description: string;
  readonly status: ReportStatus;
  readonly resolution?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
  readonly reporter?: User;
  readonly reported?: User;
}

/** Course material (documents, resources) */
export interface Material {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly fileUrl: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly isDownloadable: boolean;
  readonly uploadedAt: string;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  readonly status: 'success' | 'error';
  readonly message?: string;
  readonly data?: T;
  readonly errors?: Record<string, string[]>;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  readonly status: 'success';
  readonly data: {
    readonly items?: T[];
    readonly teachers?: T[];
    readonly courses?: T[];
    readonly reviews?: T[];
    readonly reports?: T[];
    readonly pagination: {
      readonly total: number;
      readonly page: number;
      readonly limit: number;
      readonly totalPages: number;
    };
  };
}

/** Authentication tokens */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** Login credentials */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/** User registration data */
export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
}

// Teacher Statistics
/** Teacher performance statistics */
export interface TeacherStats {
  readonly totalCourses: number;
  readonly totalEnrollments: number;
  readonly totalRevenue: number;
  readonly averageRating: number;
  readonly totalStudents: number;
  readonly isVerified: boolean;
}

// Verification Document
/** Teacher verification document */
export interface TeacherVerification {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly documentType: string;
  readonly documentUrl: string;
  readonly status: VerificationStatus;
  readonly reviewedBy?: string;
  readonly reviewNotes?: string;
  readonly submittedAt: string;
  readonly reviewedAt?: string;
  // Included when fetching pending verifications (admin)
  readonly teacherProfile?: {
    id: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

// Teacher Profile Submission
/** Teacher profile submission for review */
export interface TeacherProfileSubmission {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly status: VerificationStatus;
  readonly submittedAt: string;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly reviewNotes?: string;
}

// Payment with expanded details
/** Payment with user and package details */
export interface PaymentWithDetails extends Payment {
  readonly user?: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  };
  readonly package?: {
    readonly name: string;
    readonly course?: {
      readonly title: string;
    };
  };
}

// Wallet & Payouts
/** Wallet transaction type enumeration */
export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Wallet transaction source enumeration */
export enum WalletTransactionSource {
  COURSE_SALE = 'COURSE_SALE',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  PAYOUT = 'PAYOUT',
}

/** Wallet summary for teacher earnings */
export interface WalletSummary {
  readonly id: string;
  readonly userId: string;
  readonly availableBalance: number;
  readonly pendingPayout: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Individual wallet transaction */
export interface WalletTransaction {
  readonly id: string;
  readonly walletId: string;
  readonly amount: number;
  readonly type: WalletTransactionType;
  readonly source: WalletTransactionSource;
  readonly referenceId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
}

/** Payout method type enumeration */
export enum PayoutMethodType {
  BANK_TRANSFER = 'BANK_TRANSFER',
  GRABPAY = 'GRABPAY',
  TOUCH_N_GO = 'TOUCH_N_GO',
  PAYPAL = 'PAYPAL',
  OTHER = 'OTHER',
}

/** Payout method configuration */
export interface PayoutMethod {
  readonly id: string;
  readonly walletId: string;
  readonly type: PayoutMethodType;
  readonly label: string;
  readonly details: Record<string, string | number | boolean>; // { bankName, accountNo, accountName } | { phone, walletId } etc.
  readonly isDefault: boolean;
  readonly isVerified: boolean;
  readonly createdAt: string;
}

/** Payout request status enumeration */
export enum PayoutRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

/** Payout request from teacher */
export interface PayoutRequest {
  readonly id: string;
  readonly walletId: string;
  readonly methodId?: string;
  readonly amount: number;
  readonly status: PayoutRequestStatus;
  readonly note?: string;
  readonly adminNote?: string;
  readonly externalReference?: string;
  readonly requestedAt: string;
  readonly processedAt?: string;
}

