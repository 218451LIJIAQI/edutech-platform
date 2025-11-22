import api from './api';

/**
 * Upload Service
 * Handles file uploads
 */

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export const uploadService = {
  /**
   * Upload a file
   */
  uploadFile: async (file: File, folder: string = 'general'): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await api.post<{ status: string; data: UploadResponse }>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  /**
   * Upload course thumbnail
   */
  uploadThumbnail: async (file: File): Promise<string> => {
    const result = await uploadService.uploadFile(file, 'thumbnails');
    return result.url;
  },

  /**
   * Upload course video
   */
  uploadVideo: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'videos');

    const response = await api.post<{ status: string; data: UploadResponse }>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(progress);
          }
        },
      }
    );

    return response.data.data.url;
  },

  /**
   * Upload document/material
   */
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    return uploadService.uploadFile(file, 'documents');
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const result = await uploadService.uploadFile(file, 'avatars');
    return result.url;
  },

  /**
   * Upload verification document
   */
  uploadVerificationDoc: async (file: File): Promise<string> => {
    const result = await uploadService.uploadFile(file, 'verifications');
    return result.url;
  },
};

export default uploadService;

