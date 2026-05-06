import type { Material } from '@/types';
import { normalizeSafeHttpUrl, normalizeSafeInternalPath } from '@/utils/safe-url';
import type { MaterialFormData, MaterialSourceType } from './types';

interface MaterialUploadResult {
  url: string;
  size: number;
  mimeType: string;
}

interface MaterialUploadServiceLike {
  uploadDocument: (file: File) => Promise<MaterialUploadResult>;
}

interface MaterialToastController {
  show: (message: string) => string;
  dismiss: (toastId: string) => void;
}

const DEFAULT_MATERIAL_MIME_TYPE = 'application/octet-stream';

const MATERIAL_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  txt: 'text/plain',
};

const getFileExtensionFromUrl = (fileUrl: string): string => {
  try {
    const url = new URL(fileUrl, 'https://local.invalid');
    const pathname = url.pathname;
    const lastDotIndex = pathname.lastIndexOf('.');

    if (lastDotIndex === -1 || lastDotIndex === pathname.length - 1) {
      return '';
    }

    return pathname.substring(lastDotIndex + 1).toLowerCase();
  } catch {
    return '';
  }
};

const inferMaterialMimeTypeFromUrl = (fileUrl: string): string => {
  const extension = getFileExtensionFromUrl(fileUrl);

  return extension && MATERIAL_MIME_TYPES[extension]
    ? MATERIAL_MIME_TYPES[extension]
    : DEFAULT_MATERIAL_MIME_TYPE;
};

const normalizeMaterialUrl = (value: string): string => {
  const trimmedValue = value.trim();
  const safeUrl =
    normalizeSafeHttpUrl(trimmedValue) || normalizeSafeInternalPath(trimmedValue);

  if (!safeUrl) {
    throw new Error('Material file must be a valid http(s) URL or internal file path');
  }

  return safeUrl;
};

const resolveMaterialMimeType = (mimeType: string, fileUrl: string): string => {
  const normalizedMimeType = mimeType.trim();

  return normalizedMimeType || inferMaterialMimeTypeFromUrl(fileUrl);
};

const validateMaterialFileSize = (size: number): number => {
  if (!Number.isFinite(size) || size < 0) {
    throw new Error('Uploaded material returned an invalid file size');
  }

  return size;
};

export const buildMaterialSavePayload = async (params: {
  data: MaterialFormData;
  materialType: MaterialSourceType;
  materialFile: File | null;
  materialLink: string;
  existingMaterial?: Pick<Material, 'fileUrl' | 'fileType' | 'fileSize'>;
  uploadService: MaterialUploadServiceLike;
  toastController: MaterialToastController;
}): Promise<Partial<Material>> => {
  const {
    data,
    materialType,
    materialFile,
    materialLink,
    existingMaterial,
    uploadService,
    toastController,
  } = params;

  if (materialType === 'upload') {
    if (!materialFile) {
      throw new Error(
        existingMaterial
          ? 'Please upload a file to replace the current material'
          : 'Please upload a file or provide a link',
      );
    }

    const loadingToastId = toastController.show('Uploading material...');

    try {
      const uploadResult = await uploadService.uploadDocument(materialFile);
      const safeFileUrl = normalizeMaterialUrl(uploadResult.url);

      return {
        ...data,
        fileUrl: safeFileUrl,
        fileType: resolveMaterialMimeType(uploadResult.mimeType, safeFileUrl),
        fileSize: validateMaterialFileSize(uploadResult.size),
      };
    } finally {
      toastController.dismiss(loadingToastId);
    }
  }

  if (materialType === 'link') {
    const fileUrl = materialLink.trim();

    if (!fileUrl) {
      throw new Error(
        existingMaterial
          ? 'Please provide a link to replace the current material'
          : 'Please upload a file or provide a link',
      );
    }

    const safeFileUrl = normalizeMaterialUrl(fileUrl);

    if (existingMaterial && safeFileUrl === existingMaterial.fileUrl) {
      return {
        ...data,
      };
    }

    return {
      ...data,
      fileUrl: safeFileUrl,
      fileType: inferMaterialMimeTypeFromUrl(safeFileUrl),
      fileSize: 0,
    };
  }

  throw new Error('Please upload a file or provide a link');
};
