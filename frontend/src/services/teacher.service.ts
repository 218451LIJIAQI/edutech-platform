import api from './api';
import { 
  TeacherProfile, 
  Certification, 
  ApiResponse, 
  PaginatedResponse,
  TeacherStats,
  TeacherVerification
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
};

export default teacherService;

