import { CourseType } from '@/types';
import type { CourseUpdatePayload } from '@/services/course.service';
import { toStorableBackendAssetPath } from '@/utils/runtime';
import { normalizeSafeHttpUrl } from '@/utils/safe-url';
import type { CourseFormData, MediaSourceType, PendingDeleteItem } from './types';

interface CourseUploadServiceLike {
  uploadThumbnail: (file: File) => Promise<string>;
  uploadVideo: (file: File) => Promise<string>;
}

interface CourseMediaDraft {
  thumbnailType: MediaSourceType;
  thumbnailFile: File | null;
  thumbnailLink: string;
  previewVideoType: MediaSourceType;
  previewVideoFile: File | null;
  previewVideoLink: string;
}

interface PreviewUploadToastController {
  show: (message: string) => string;
  dismiss: (toastId: string) => void;
}

type DeleteKind = NonNullable<PendingDeleteItem>['kind'];

const normalizeText = (value: string | null | undefined): string =>
  value?.trim() ?? '';

const normalizeOptionalMediaUrl = (
  value: string | null | undefined,
  fieldName: string
): string | undefined => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const storable = toStorableBackendAssetPath(trimmedValue);
  if (storable.startsWith('/uploads/')) {
    return storable;
  }

  const safeUrl = normalizeSafeHttpUrl(storable);
  if (!safeUrl) {
    throw new Error(`${fieldName} must be a valid http(s) URL`);
  }

  return safeUrl;
};

const deleteSuccessMessages: Record<DeleteKind, string> = {
  lesson: 'Lesson deleted successfully!',
  package: 'Package deleted successfully!',
  material: 'Material deleted successfully!',
};

const deleteDialogLabels: Record<DeleteKind, string> = {
  lesson: 'Delete Lesson',
  package: 'Delete Package',
  material: 'Delete Material',
};

const resolveThumbnailUrl = async (
  data: CourseFormData,
  media: CourseMediaDraft,
  uploadService: CourseUploadServiceLike,
  isEditMode: boolean
): Promise<string | null | undefined> => {
  if (media.thumbnailType === 'upload') {
    if (media.thumbnailFile) {
      const uploadedUrl = await uploadService.uploadThumbnail(media.thumbnailFile);
      return toStorableBackendAssetPath(uploadedUrl);
    }

    const existingStorable = toStorableBackendAssetPath(data.thumbnail);
    if (existingStorable) {
      return existingStorable;
    }

    return isEditMode ? null : undefined;
  }

  const normalizedLink = normalizeOptionalMediaUrl(
    media.thumbnailLink,
    'Thumbnail link'
  );
  if (normalizedLink) {
    return normalizedLink;
  }

  return isEditMode ? null : undefined;
};

const resolvePreviewVideoUrl = async (
  data: CourseFormData,
  media: CourseMediaDraft,
  uploadService: CourseUploadServiceLike,
  previewUploadToast: PreviewUploadToastController,
  isEditMode: boolean
): Promise<string | null | undefined> => {
  if (media.previewVideoType === 'upload') {
    if (media.previewVideoFile) {
      const loadingToastId = previewUploadToast.show('Uploading preview video...');
      try {
        const uploadedUrl = await uploadService.uploadVideo(media.previewVideoFile);
        return toStorableBackendAssetPath(uploadedUrl);
      } finally {
        previewUploadToast.dismiss(loadingToastId);
      }
    }

    const existingStorable = toStorableBackendAssetPath(data.previewVideoUrl);
    if (existingStorable) {
      return existingStorable;
    }

    return isEditMode ? null : undefined;
  }

  const normalizedLink = normalizeOptionalMediaUrl(
    media.previewVideoLink,
    'Preview video link'
  );
  if (normalizedLink) {
    return normalizedLink;
  }

  return isEditMode ? null : undefined;
};

export const buildCourseSavePayload = async (params: {
  data: CourseFormData;
  media: CourseMediaDraft;
  uploadService: CourseUploadServiceLike;
  previewUploadToast: PreviewUploadToastController;
  isEditMode?: boolean;
}): Promise<CourseUpdatePayload> => {
  const {
    data,
    media,
    uploadService,
    previewUploadToast,
    isEditMode = false,
  } = params;

  const [thumbnailUrl, previewVideoUrl] = await Promise.all([
    resolveThumbnailUrl(data, media, uploadService, isEditMode),
    resolvePreviewVideoUrl(
      data,
      media,
      uploadService,
      previewUploadToast,
      isEditMode
    ),
  ]);

  const cleanPayload: CourseUpdatePayload = {
    title: normalizeText(data.title),
    description: normalizeText(data.description),
    category: normalizeText(data.category),
    courseType: data.courseType ?? CourseType.RECORDED,
  };

  if (thumbnailUrl !== undefined) {
    cleanPayload.thumbnail = thumbnailUrl;
  }

  if (previewVideoUrl !== undefined) {
    cleanPayload.previewVideoUrl = previewVideoUrl;
  }

  return cleanPayload;
};

export const buildDeleteSuccessMessage = (kind: DeleteKind): string =>
  deleteSuccessMessages[kind];

export const buildDeleteDialogLabel = (
  pendingDeleteItem: PendingDeleteItem
): string => {
  if (!pendingDeleteItem) {
    return 'Delete';
  }

  return deleteDialogLabels[pendingDeleteItem.kind];
};
