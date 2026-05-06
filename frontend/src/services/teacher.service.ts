import api from './api';
import {
  TeacherProfile,
  ApiResponse,
  PaginatedResponse,
  TeacherStats,
  TeacherVerification,
  RegistrationStatus,
  VerificationStatus,
} from '@/types';
import { extractData, extractPaginatedData } from './response-utils';
import {
  normalizeTeacherProfileAssets,
  normalizeTeacherVerificationAssets,
} from '@/utils/asset-normalizers';

/**
 * Teacher Service
 * Handles all teacher-related API calls
 */

const teacherService = {
  /**
   * Get all teachers
   */
  getAllTeachers: async (params?: {
    isVerified?: boolean;
    category?: string;
    minRating?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers', { params });
    const data = extractPaginatedData(response);
    const normalizedTeachers = ((data.items || data.teachers || []) as TeacherProfile[]).map(
      (teacher) => normalizeTeacherProfileAssets(teacher) ?? teacher
    );
    return {
      ...data,
      teachers: normalizedTeachers,
      items: normalizedTeachers,
    };
  },

  /**
   * Get teacher by ID
   */
  getTeacherById: async (id: string): Promise<TeacherProfile> => {
    const response = await api.get<ApiResponse<TeacherProfile>>(`/teachers/${id}`);
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Get teacher statistics
   */
  getStats: async (): Promise<TeacherStats> => {
    const response = await api.get<ApiResponse<TeacherStats>>('/teachers/me/stats');
    return extractData(response);
  },

  /**
   * Submit verification document
   */
  submitVerification: async (documentType: string, documentUrl: string): Promise<TeacherVerification> => {
    const response = await api.post<ApiResponse<TeacherVerification>>('/teachers/me/verifications', {
      documentType,
      documentUrl,
    });
    return normalizeTeacherVerificationAssets(extractData(response));
  },

  /**
   * Get my verifications
   */
  getMyVerifications: async (): Promise<TeacherVerification[]> => {
    const response = await api.get<ApiResponse<TeacherVerification[]>>('/teachers/me/verifications');
    return extractData(response).map((verification) =>
      normalizeTeacherVerificationAssets(verification)
    );
  },

  /**
   * Submit extended profile for review
   */
  submitExtendedProfile: async (data: {
    selfIntroduction?: string;
    educationBackground?: string;
    teachingExperience?: string;
    awards?: string[];
    specialties?: string[];
    teachingStyle?: string;
    languages?: string[];
    yearsOfExperience?: number;
    profilePhoto?: string;
    certificatePhotos?: string[];
  }): Promise<TeacherProfile> => {
    const response = await api.post<ApiResponse<TeacherProfile>>(
      '/teachers/me/profile/submit',
      data
    );
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Get extended profile
   */
  getExtendedProfile: async (): Promise<TeacherProfile> => {
    const response = await api.get<ApiResponse<TeacherProfile>>('/teachers/me/profile/extended');
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Update extended profile (for approved teachers)
   */
  updateExtendedProfile: async (data: {
    selfIntroduction?: string;
    educationBackground?: string;
    teachingExperience?: string;
    awards?: string[];
    specialties?: string[];
    teachingStyle?: string;
    languages?: string[];
    yearsOfExperience?: number;
    profilePhoto?: string;
    certificatePhotos?: string[];
  }): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      '/teachers/me/profile/update',
      data
    );
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Get verified teachers (for students)
   */
  getVerifiedTeachers: async (params?: {
    search?: string;
    minRating?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/verified', { params });
    const data = extractPaginatedData(response);
    const normalizedTeachers = ((data.items || data.teachers || []) as TeacherProfile[]).map(
      (teacher) => normalizeTeacherProfileAssets(teacher) ?? teacher
    );
    return {
      ...data,
      teachers: normalizedTeachers,
      items: normalizedTeachers,
    };
  },

  /**
   * Get pending registrations (Admin only)
   */
  getPendingRegistrations: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/admin/pending-registrations', { params });
    const data = extractPaginatedData(response);
    const normalizedTeachers = ((data.items || data.teachers || []) as TeacherProfile[]).map(
      (teacher) => normalizeTeacherProfileAssets(teacher) ?? teacher
    );
    return {
      ...data,
      teachers: normalizedTeachers,
      items: normalizedTeachers,
    };
  },

  /**
   * Review teacher registration (Admin only)
   */
  reviewRegistration: async (
    teacherProfileId: string,
    status: RegistrationStatus.APPROVED | RegistrationStatus.REJECTED,
    reviewNotes?: string
  ): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      `/teachers/admin/registrations/${teacherProfileId}/review`,
      { status, reviewNotes }
    );
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Get pending profile verifications (Admin only)
   */
  getPendingProfileVerifications: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/admin/pending-profiles', { params });
    const data = extractPaginatedData(response);
    const normalizedTeachers = ((data.items || data.teachers || []) as TeacherProfile[]).map(
      (teacher) => normalizeTeacherProfileAssets(teacher) ?? teacher
    );
    return {
      ...data,
      teachers: normalizedTeachers,
      items: normalizedTeachers,
    };
  },

  /**
   * Review teacher profile (Admin only)
   */
  reviewTeacherProfile: async (
    teacherProfileId: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    reviewNotes?: string
  ): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      `/teachers/admin/profiles/${teacherProfileId}/review`,
      { status, reviewNotes }
    );
    return normalizeTeacherProfileAssets(extractData(response)) as TeacherProfile;
  },

  /**
   * Get pending certificate verifications (Admin only)
   * These are document/certificate submissions from teachers
   */
  getPendingCertificateVerifications: async (): Promise<TeacherVerification[]> => {
    const response = await api.get<ApiResponse<TeacherVerification[]>>('/teachers/verifications/pending');
    return extractData(response).map((verification) =>
      normalizeTeacherVerificationAssets(verification)
    );
  },

  /**
   * Review certificate verification (Admin only)
   */
  reviewCertificateVerification: async (
    verificationId: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    reviewNotes?: string
  ): Promise<TeacherVerification> => {
    const response = await api.put<ApiResponse<TeacherVerification>>(
      `/teachers/verifications/${verificationId}/review`,
      { status, reviewNotes }
    );
    return normalizeTeacherVerificationAssets(extractData(response));
  },
};

export default teacherService;
