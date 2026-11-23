import type { Lesson } from '@/types';
import type { LessonUpdatePayload } from '@/services/course.service';
import { toStorableBackendAssetPath } from '@/utils/runtime';
import { normalizeSafeHttpUrl } from '@/utils/safe-url';
import type { LessonFormData, VideoSourceType, EditableQuizQuestion } from './types';
import { buildLessonQuizPayload } from './quiz-utils';

interface LessonUploadServiceLike {
  uploadVideo: (
    file: File,
    onProgress?: (progress: number) => void
  ) => Promise<string>;
}

interface LessonToastController {
  show: (message: string) => string;
  dismiss: (toastId: string) => void;
}

export const buildLessonSavePayload = async (params: {
  data: LessonFormData;
  videoType: VideoSourceType;
  videoFile: File | null;
  videoLink: string;
  clearExistingVideo?: boolean;
  existingLesson?: Pick<Lesson, 'videoUrl'>;
  quizEnabled: boolean;
  quizQuestions: EditableQuizQuestion[];
  uploadService: LessonUploadServiceLike;
  uploadProgressHandler: (progress: number) => void;
  toastController: LessonToastController;
}): Promise<LessonUpdatePayload> => {
  const {
    data,
    videoType,
    videoFile,
    videoLink,
    clearExistingVideo = false,
    existingLesson,
    quizEnabled,
    quizQuestions,
    uploadService,
    uploadProgressHandler,
    toastController,
  } = params;

  const isEditMode = Boolean(existingLesson);
  let videoUrl: string | null | undefined;

  if (videoType === 'upload') {
    if (videoFile) {
      const loadingToastId = toastController.show('Uploading video...');
      try {
        const uploadedUrl = await uploadService.uploadVideo(
          videoFile,
          uploadProgressHandler
        );
        videoUrl = toStorableBackendAssetPath(uploadedUrl);
      } finally {
        toastController.dismiss(loadingToastId);
      }
    } else if (clearExistingVideo) {
      videoUrl = isEditMode ? null : undefined;
    } else if (existingLesson?.videoUrl) {
      videoUrl = toStorableBackendAssetPath(existingLesson.videoUrl);
    }
  } else {
    const trimmedLink = videoLink.trim();
    if (trimmedLink) {
      const storableLink = toStorableBackendAssetPath(trimmedLink);
      if (storableLink.startsWith('/uploads/')) {
        videoUrl = storableLink;
      } else {
        const safeVideoLink = normalizeSafeHttpUrl(storableLink);
        if (!safeVideoLink) {
          throw new Error('Video link must be a valid http(s) URL');
        }
        videoUrl = safeVideoLink;
      }
    } else if (existingLesson?.videoUrl) {
      videoUrl = null;
    }
  }

  const rawDuration =
    typeof data.duration === 'string'
      ? Number.parseInt(data.duration, 10)
      : data.duration;

  const duration =
    typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.trunc(rawDuration)
      : isEditMode
        ? null
        : undefined;

  const trimmedDescription = data.description?.trim() ?? '';

  return {
    title: data.title.trim(),
    description: trimmedDescription || (isEditMode ? null : undefined),
    type: data.type,
    isFree: Boolean(data.isFree),
    ...(duration !== undefined ? { duration } : {}),
    ...(videoUrl !== undefined ? { videoUrl } : {}),
    quiz: buildLessonQuizPayload(quizEnabled, quizQuestions),
  };
};
