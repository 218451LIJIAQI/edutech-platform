import type { User } from './user';
import { RegistrationStatus, VerificationStatus } from './enums';

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
  readonly commissionRate?: number;
  readonly isVerified: boolean;
  readonly verificationStatus?: VerificationStatus;
  readonly registrationStatus?: RegistrationStatus;
  readonly selfIntroduction?: string;
  readonly educationBackground?: string;
  readonly teachingExperience?: string;
  readonly awards?: string[] | string;
  readonly specialties?: string[] | string;
  readonly teachingStyle?: string;
  readonly languages?: string[] | string;
  readonly yearsOfExperience?: number;
  readonly profilePhoto?: string;
  readonly certificatePhotos?: string[] | string;
  readonly profileCompletionStatus?: string;
  readonly profileSubmittedAt?: string;
  readonly profileReviewedAt?: string;
  readonly profileReviewNotes?: string;
  readonly hasPendingProfileSubmission?: boolean;
  readonly pendingProfileSubmittedAt?: string;
  readonly user?: User;
  readonly certifications?: Certification[];
}

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

export interface TeacherStats {
  readonly totalCourses: number;
  readonly totalEnrollments: number;
  readonly totalRevenue: number;
  readonly averageRating: number;
  readonly totalStudents: number;
  readonly isVerified: boolean;
}

export interface TeacherVerification {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly documentType: string;
  readonly documentUrl: string;
  readonly accessUrl?: string;
  readonly status: VerificationStatus;
  readonly reviewedBy?: string;
  readonly reviewNotes?: string;
  readonly submittedAt: string;
  readonly reviewedAt?: string;
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
