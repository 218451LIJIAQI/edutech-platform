import { CourseType } from '@/types';
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

const normalizeText = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

const normalizeOptionalText = (
  value: string | null | undefined
): string | undefined => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const normalizeOptionalMediaUrl = (
  value: string | null | undefined,
  fieldName: string
): string | undefined => {
  const trimmedValue = normalizeOptionalText(value);
  if (!trimmedValue) {
    return undefined;
  }

  const safeUrl = normalizeSafeHttpUrl(trimmedValue);
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
  uploadService: CourseUploadServiceLike
): Promise<string | undefined> => {
  if (media.thumbnailType === 'upload' && media.thumbnailFile) {
    return uploadService.uploadThumbnail(media.thumbnailFile);
  }

  if (media.thumbnailType === 'link') {
    return (
      normalizeOptionalMediaUrl(media.thumbnailLink, 'Thumbnail link') ??
      normalizeOptionalMediaUrl(data.thumbnail, 'Thumbnail link')
    );
  }

  return normalizeOptionalText(data.thumbnail);
};

const resolvePreviewVideoUrl = async (
  data: CourseFormData,
  media: CourseMediaDraft,
  uploadService: CourseUploadServiceLike,
  previewUploadToast: PreviewUploadToastController
): Promise<string | undefined> => {
  if (media.previewVideoType === 'upload' && media.previewVideoFile) {
    const loadingToastId = previewUploadToast.show('Uploading preview video...');

    try {
      return await uploadService.uploadVideo(media.previewVideoFile);
    } finally {
      previewUploadToast.dismiss(loadingToastId);
    }
  }

  if (media.previewVideoType === 'link') {
    return (
      normalizeOptionalMediaUrl(media.previewVideoLink, 'Preview video link') ??
      normalizeOptionalMediaUrl(data.previewVideoUrl, 'Preview video link')
    );
  }

  return normalizeOptionalText(data.previewVideoUrl);
};

export const buildCourseSavePayload = async (params: {
  data: CourseFormData;
  media: CourseMediaDraft;
  uploadService: CourseUploadServiceLike;
  previewUploadToast: PreviewUploadToastController;
}): Promise<Record<string, unknown>> => {
  const { data, media, uploadService, previewUploadToast } = params;

  const [thumbnailUrl, previewVideoUrl] = await Promise.all([
    resolveThumbnailUrl(data, media, uploadService),
    resolvePreviewVideoUrl(data, media, uploadService, previewUploadToast),
  ]);

  const cleanPayload: Record<string, unknown> = {
    title: normalizeText(data.title),
    description: normalizeText(data.description),
    category: normalizeText(data.category),
    courseType: data.courseType ?? CourseType.RECORDED,
  };

  if (thumbnailUrl) {
    cleanPayload.thumbnail = thumbnailUrl;
  }

  if (previewVideoUrl) {
    cleanPayload.previewVideoUrl = previewVideoUrl;
  }

  return cleanPayload;
};

export const buildDeleteSuccessMessage = (kind: DeleteKind): string => {
  return deleteSuccessMessages[kind];
};

export const buildDeleteDialogLabel = (
  pendingDeleteItem: PendingDeleteItem
): string => {
  if (!pendingDeleteItem) {
    return 'Delete';
  }

  return deleteDialogLabels[pendingDeleteItem.kind];
};
