import api from './api';
import { extractErrorMessage } from '@/utils/error-handler';
import { ApiResponse } from '@/types';
import { extractData } from './response-utils';

/**
 * Upload Service
 * Handles file uploads
 */

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  originalName?: string;
}

export const UPLOAD_FOLDERS = {
  GENERAL: 'general',
  SUPPORT_ATTACHMENTS: 'support-attachments',
  COMMUNITY_IMAGES: 'community-images',
  THUMBNAILS: 'thumbnails',
  VIDEOS: 'videos',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  VERIFICATIONS: 'verifications',
  TEACHER_PROFILES: 'teacher-profiles',
  TEACHER_CERTIFICATES: 'teacher-certificates',
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  thumbnails: 5 * 1024 * 1024, // 5MB
  videos: 500 * 1024 * 1024, // 500MB
  documents: 50 * 1024 * 1024, // 50MB
  avatars: 5 * 1024 * 1024, // 5MB
  verifications: 10 * 1024 * 1024, // 10MB
  general: 10 * 1024 * 1024, // 10MB for general files
  'support-attachments': 10 * 1024 * 1024, // 10MB
  'community-images': 10 * 1024 * 1024, // 10MB
  'teacher-profiles': 5 * 1024 * 1024, // 5MB
  'teacher-certificates': 10 * 1024 * 1024, // 10MB
} satisfies Record<UploadFolder, number>;

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  thumbnails: ['image/jpeg', 'image/png', 'image/webp'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
  ],
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  verifications: ['image/jpeg', 'image/png', 'application/pdf'],
  general: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], // Allow common types for general folder
  'support-attachments': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'community-images': ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  'teacher-profiles': ['image/jpeg', 'image/png', 'image/webp'],
  'teacher-certificates': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
} satisfies Record<UploadFolder, string[]>;

const ALLOWED_FILE_EXTENSIONS = {
  thumbnails: ['.jpg', '.jpeg', '.png', '.webp'],
  videos: ['.mp4', '.webm', '.mov'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.txt'],
  avatars: ['.jpg', '.jpeg', '.png', '.webp'],
  verifications: ['.jpg', '.jpeg', '.png', '.pdf'],
  general: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  'support-attachments': ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  'community-images': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'],
  'teacher-profiles': ['.jpg', '.jpeg', '.png', '.webp'],
  'teacher-certificates': ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
} satisfies Record<UploadFolder, string[]>;

function wrapUploadError(action: string, error: unknown): never {
  throw new Error(`${action}: ${extractErrorMessage(error, 'Unknown error')}`);
}

function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionStart = normalizedName.lastIndexOf('.');

  return extensionStart >= 0 ? normalizedName.slice(extensionStart) : '';
}

/**
 * Validate file before upload
 */
function validateFile(file: File, folder: UploadFolder): void {
  const limits = FILE_SIZE_LIMITS[folder];
  const allowedTypes = ALLOWED_MIME_TYPES[folder];
  const allowedExtensions = ALLOWED_FILE_EXTENSIONS[folder];

  if (!limits || !allowedTypes || !allowedExtensions) {
    throw new Error(`Unknown folder type: ${folder}`);
  }

  if (file.size > limits) {
    throw new Error(`File size exceeds limit of ${limits / 1024 / 1024}MB`);
  }

  const fileType = file.type.toLowerCase();
  const fileExtension = getFileExtension(file.name);
  const hasAllowedMimeType = Boolean(fileType && allowedTypes.includes(fileType));
  const hasAllowedExtension = allowedExtensions.includes(fileExtension);

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    throw new Error(
      `File type ${file.type || fileExtension || 'unknown'} is not allowed for ${folder}. Allowed formats: ${allowedExtensions.join(', ')}`
    );
  }
}

const uploadService = {
  /**
   * Upload a file
   */
  uploadFile: async (
    file: File,
    folder: UploadFolder = UPLOAD_FOLDERS.GENERAL
  ): Promise<UploadResponse> => {
    validateFile(file, folder);

    const formData = new FormData();
    formData.append('folder', folder);
    formData.append('file', file);

    const response = await api.post<ApiResponse<UploadResponse>>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return extractData(response);
  },

  /**
   * Upload course thumbnail
   */
  uploadThumbnail: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, UPLOAD_FOLDERS.THUMBNAILS);
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload thumbnail', error);
    }
  },

  /**
   * Upload course video
   */
  uploadVideo: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    try {
      validateFile(file, UPLOAD_FOLDERS.VIDEOS);

      const formData = new FormData();
      formData.append('folder', UPLOAD_FOLDERS.VIDEOS);
      formData.append('file', file);

      const response = await api.post<ApiResponse<UploadResponse>>(
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

      return extractData(response).url;
    } catch (error) {
      wrapUploadError('Failed to upload video', error);
    }
  },

  /**
   * Upload document/material
   */
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    try {
      return await uploadService.uploadFile(file, UPLOAD_FOLDERS.DOCUMENTS);
    } catch (error) {
      wrapUploadError('Failed to upload document', error);
    }
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, UPLOAD_FOLDERS.AVATARS);
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload avatar', error);
    }
  },

  /**
   * Upload verification document
   */
  uploadVerificationDoc: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, UPLOAD_FOLDERS.VERIFICATIONS);
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload verification document', error);
    }
  },

  uploadCommunityImage: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, UPLOAD_FOLDERS.COMMUNITY_IMAGES);
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload community image', error);
    }
  },

  uploadTeacherProfilePhoto: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(file, UPLOAD_FOLDERS.TEACHER_PROFILES);
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload teacher profile photo', error);
    }
  },

  uploadTeacherCertificatePhoto: async (file: File): Promise<string> => {
    try {
      const result = await uploadService.uploadFile(
        file,
        UPLOAD_FOLDERS.TEACHER_CERTIFICATES
      );
      return result.url;
    } catch (error) {
      wrapUploadError('Failed to upload teacher certificate photo', error);
    }
  },
};

export default uploadService;
