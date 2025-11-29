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

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  thumbnails: 5 * 1024 * 1024, // 5MB
  videos: 500 * 1024 * 1024, // 500MB
  documents: 50 * 1024 * 1024, // 50MB
  avatars: 5 * 1024 * 1024, // 5MB
  verifications: 10 * 1024 * 1024, // 10MB
  general: 10 * 1024 * 1024, // 10MB for general files
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  thumbnails: ['image/jpeg', 'image/png', 'image/webp'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  verifications: ['image/jpeg', 'image/png', 'application/pdf'],
  general: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], // Allow common types for general folder
};

/**
 * Validate file before upload
 */
function validateFile(file: File, folder: string): void {
  const limits = FILE_SIZE_LIMITS[folder as keyof typeof FILE_SIZE_LIMITS];
  const allowedTypes = ALLOWED_MIME_TYPES[folder as keyof typeof ALLOWED_MIME_TYPES];

  if (!limits || !allowedTypes) {
    throw new Error(`Unknown folder type: ${folder}`);
  }

  if (file.size > limits) {
    throw new Error(`File size exceeds limit of ${limits / 1024 / 1024}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed for ${folder}`);
  }
}

export const uploadService = {
  /**
   * Upload a file
   */
  uploadFile: async (file: File, folder: string = 'general'): Promise<UploadResponse> => {
    validateFile(file, folder);

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

    if (!response.data.data) {
      throw new Error('No upload response data received');
    }

    return response.data.data;
  },

  /**
   * Upload course thumbnail
   */
  uploadThumbnail: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, 'thumbnails');
      return result.url;
    } catch (error) {
      throw new Error(`Failed to upload thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Upload course video
   */
  uploadVideo: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    try {
      validateFile(file, 'videos');

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
            if (progressEvent.total && progressEvent.total > 0) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress?.(Math.min(progress, 100));
            }
          },
        }
      );

      if (!response.data.data) {
        throw new Error('No upload response data received');
      }

      return response.data.data.url;
    } catch (error) {
      throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Upload document/material
   */
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    try {
      return await uploadService.uploadFile(file, 'documents');
    } catch (error) {
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, 'avatars');
      return result.url;
    } catch (error) {
      throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Upload verification document
   */
  uploadVerificationDoc: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, 'verifications');
      return result.url;
    } catch (error) {
      throw new Error(`Failed to upload verification document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

export default uploadService;

