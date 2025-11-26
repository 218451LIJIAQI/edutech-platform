import api from './api';
import { 
  TeacherProfile, 
  Certification, 
  ApiResponse, 
  PaginatedResponse,
  TeacherStats,
  TeacherVerification,
  TeacherProfileSubmission
} from '@/types';

/**
 * Teacher Service
 * Handles all teacher-related API calls
 */

export const teacherService = {
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
    return response.data.data;
  },

  /**
   * Get teacher by ID
   */
  getTeacherById: async (id: string): Promise<TeacherProfile> => {
    const response = await api.get<ApiResponse<TeacherProfile>>(`/teachers/${id}`);
    return response.data.data!;
  },

  /**
   * Get my teacher profile
   */
  getMyProfile: async (): Promise<TeacherProfile> => {
    const response = await api.get<ApiResponse<TeacherProfile>>('/teachers/me/profile');
    return response.data.data!;
  },

  /**
   * Update teacher profile
   */
  updateProfile: async (data: Partial<TeacherProfile>): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      '/teachers/me/profile',
      data
    );
    return response.data.data!;
  },

  /**
   * Get teacher statistics
   */
  getStats: async (): Promise<TeacherStats> => {
    const response = await api.get<ApiResponse<TeacherStats>>('/teachers/me/stats');
    return response.data.data!;
  },

  /**
   * Add certification
   */
  addCertification: async (data: Partial<Certification>): Promise<Certification> => {
    const response = await api.post<ApiResponse<Certification>>(
      '/teachers/me/certifications',
      data
    );
    return response.data.data!;
  },

  /**
   * Delete certification
   */
  deleteCertification: async (id: string): Promise<void> => {
    await api.delete(`/teachers/me/certifications/${id}`);
  },

  /**
   * Submit verification document
   */
  submitVerification: async (documentType: string, documentUrl: string): Promise<TeacherVerification> => {
    const response = await api.post<ApiResponse<TeacherVerification>>('/teachers/me/verifications', {
      documentType,
      documentUrl,
    });
    return response.data.data!;
  },

  /**
   * Get my verifications
   */
  getMyVerifications: async (): Promise<TeacherVerification[]> => {
    const response = await api.get<ApiResponse<TeacherVerification[]>>('/teachers/me/verifications');
    return response.data.data!;
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
    return response.data.data!;
  },

  /**
   * Get extended profile
   */
  getExtendedProfile: async (): Promise<TeacherProfile> => {
    const response = await api.get<ApiResponse<TeacherProfile>>('/teachers/me/profile/extended');
    return response.data.data!;
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
    return response.data.data!;
  },

  /**
   * Get verified teachers (for students)
   */
  getVerifiedTeachers: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/verified', { params });
    return response.data.data;
  },

  /**
   * Get pending registrations (Admin only)
   */
  getPendingRegistrations: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/admin/pending-registrations', { params });
    return response.data.data;
  },

  /**
   * Review teacher registration (Admin only)
   */
  reviewRegistration: async (
    teacherProfileId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      `/teachers/admin/registrations/${teacherProfileId}/review`,
      { status }
    );
    return response.data.data!;
  },

  /**
   * Get pending profile verifications (Admin only)
   */
  getPendingProfileVerifications: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/admin/pending-profiles', { params });
    return response.data.data;
  },

  /**
   * Review teacher profile (Admin only)
   */
  reviewTeacherProfile: async (
    teacherProfileId: string,
    status: string,
    reviewNotes?: string
  ): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      `/teachers/admin/profiles/${teacherProfileId}/review`,
      { status, reviewNotes }
    );
    return response.data.data!;
  },

  /**
   * Get pending teacher registrations (Admin only)
   */
  getPendingRegistrations: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TeacherProfile>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/admin/pending-registrations', { params });
    return response.data.data;
  },

  /**
   * Review teacher registration (Admin only)
   */
  reviewRegistration: async (
    teacherProfileId: string,
    status: string
  ): Promise<TeacherProfile> => {
    const response = await api.put<ApiResponse<TeacherProfile>>(
      `/teachers/admin/registrations/${teacherProfileId}/review`,
      { status }
    );
    return response.data.data!;
  },
};

export default teacherService;

