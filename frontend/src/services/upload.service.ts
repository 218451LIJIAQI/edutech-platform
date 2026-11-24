import api from './api';
import { extractErrorMessage } from '@/utils/error-handler';
import { ApiResponse } from '@/types';
import { extractData } from './response-utils';

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  originalName?: string;
}

const UPLOAD_FOLDERS = {
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

type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

const MB = 1024 * 1024;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const IMAGE_AND_PDF_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];
const IMAGE_AND_PDF_EXTENSIONS = [...IMAGE_EXTENSIONS, '.pdf'];

const FILE_SIZE_LIMITS = {
  thumbnails: 5 * MB,
  videos: 500 * MB,
  documents: 50 * MB,
  avatars: 5 * MB,
  verifications: 10 * MB,
  general: 10 * MB,
  'support-attachments': 10 * MB,
  'community-images': 10 * MB,
  'teacher-profiles': 5 * MB,
  'teacher-certificates': 10 * MB,
} satisfies Record<UploadFolder, number>;

const ALLOWED_MIME_TYPES = {
  thumbnails: IMAGE_MIME_TYPES,
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
  avatars: IMAGE_MIME_TYPES,
  verifications: IMAGE_AND_PDF_MIME_TYPES,
  general: IMAGE_AND_PDF_MIME_TYPES,
  'support-attachments': IMAGE_AND_PDF_MIME_TYPES,
  'community-images': [...IMAGE_MIME_TYPES, 'image/gif', 'image/avif'],
  'teacher-profiles': IMAGE_MIME_TYPES,
  'teacher-certificates': IMAGE_AND_PDF_MIME_TYPES,
} satisfies Record<UploadFolder, string[]>;

const ALLOWED_FILE_EXTENSIONS = {
  thumbnails: IMAGE_EXTENSIONS,
  videos: ['.mp4', '.webm', '.mov'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.txt'],
  avatars: IMAGE_EXTENSIONS,
  verifications: IMAGE_AND_PDF_EXTENSIONS,
  general: IMAGE_AND_PDF_EXTENSIONS,
  'support-attachments': IMAGE_AND_PDF_EXTENSIONS,
  'community-images': [...IMAGE_EXTENSIONS, '.gif', '.avif'],
  'teacher-profiles': IMAGE_EXTENSIONS,
  'teacher-certificates': IMAGE_AND_PDF_EXTENSIONS,
} satisfies Record<UploadFolder, string[]>;

function wrapUploadError(action: string, error: unknown): never {
  throw new Error(`${action}: ${extractErrorMessage(error, 'Unknown error')}`);
}

function getFileExtension(fileName: string): string {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionStart = normalizedName.lastIndexOf('.');
  return extensionStart >= 0 ? normalizedName.slice(extensionStart) : '';
}

function validateFile(file: File, folder: UploadFolder): void {
  const limit = FILE_SIZE_LIMITS[folder];
  const allowedTypes = ALLOWED_MIME_TYPES[folder];
  const allowedExtensions = ALLOWED_FILE_EXTENSIONS[folder];

  if (!limit || !allowedTypes || !allowedExtensions) {
    throw new Error(`Unknown folder type: ${folder}`);
  }

  if (file.size > limit) {
    throw new Error(`File size exceeds limit of ${limit / MB}MB`);
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

async function uploadToFolderUrl(
  file: File,
  folder: UploadFolder,
  actionLabel: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const result = await uploadService.uploadFile(file, folder, onProgress);
    return result.url;
  } catch (error) {
    wrapUploadError(actionLabel, error);
  }
}

const uploadService = {
  uploadFile: async (
    file: File,
    folder: UploadFolder = UPLOAD_FOLDERS.GENERAL,
    onProgress?: (progress: number) => void
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
        onUploadProgress: onProgress
          ? (progressEvent) => {
              if (progressEvent.total && progressEvent.total > 0) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(Math.min(progress, 100));
              }
            }
          : undefined,
      }
    );

    return extractData(response);
  },

  uploadThumbnail: (file: File): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.THUMBNAILS, 'Failed to upload thumbnail'),

  uploadVideo: (file: File, onProgress?: (progress: number) => void): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.VIDEOS, 'Failed to upload video', onProgress),

  uploadDocument: async (file: File): Promise<UploadResponse> => {
    try {
      return await uploadService.uploadFile(file, UPLOAD_FOLDERS.DOCUMENTS);
    } catch (error) {
      wrapUploadError('Failed to upload document', error);
    }
  },

  uploadAvatar: (file: File): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.AVATARS, 'Failed to upload avatar'),

  uploadVerificationDoc: (file: File): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.VERIFICATIONS, 'Failed to upload verification document'),

  uploadCommunityImage: (file: File): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.COMMUNITY_IMAGES, 'Failed to upload community image'),

  uploadTeacherProfilePhoto: (file: File): Promise<string> =>
    uploadToFolderUrl(file, UPLOAD_FOLDERS.TEACHER_PROFILES, 'Failed to upload teacher profile photo'),

  uploadTeacherCertificatePhoto: (file: File): Promise<string> =>
    uploadToFolderUrl(
      file,
      UPLOAD_FOLDERS.TEACHER_CERTIFICATES,
      'Failed to upload teacher certificate photo'
    ),
};

export default uploadService;
