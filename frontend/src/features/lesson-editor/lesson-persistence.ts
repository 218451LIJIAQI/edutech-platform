import type { Lesson } from '@/types';
import { normalizeSafeHttpUrl } from '@/utils/safe-url';
import type { LessonFormData, VideoSourceType } from './types';
import { buildLessonQuizPayload } from './quiz-utils';
import type { EditableQuizQuestion } from './types';

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
  existingLesson?: Pick<Lesson, 'videoUrl'>;
  quizEnabled: boolean;
  quizQuestions: EditableQuizQuestion[];
  uploadService: LessonUploadServiceLike;
  uploadProgressHandler: (progress: number) => void;
  toastController: LessonToastController;
}) => {
  const {
    data,
    videoType,
    videoFile,
    videoLink,
    existingLesson,
    quizEnabled,
    quizQuestions,
    uploadService,
    uploadProgressHandler,
    toastController,
  } = params;

  let videoUrl = '';

  if (videoType === 'upload' && videoFile) {
    const loadingToastId = toastController.show('Uploading video...');
    try {
      videoUrl = await uploadService.uploadVideo(videoFile, uploadProgressHandler);
    } finally {
      toastController.dismiss(loadingToastId);
    }
  } else if (videoType === 'upload' && existingLesson?.videoUrl) {
    throw new Error('Please upload a video to replace the current lesson media');
  } else if (videoType === 'link' && videoLink.trim()) {
    const safeVideoLink = normalizeSafeHttpUrl(videoLink);
    if (!safeVideoLink) {
      throw new Error('Video link must be a valid http(s) URL');
    }

    videoUrl =
      existingLesson?.videoUrl && safeVideoLink === existingLesson.videoUrl
        ? ''
        : safeVideoLink;
  } else if (videoType === 'link' && existingLesson?.videoUrl) {
    throw new Error('Please provide a video link to replace the current lesson media');
  }

  const duration =
    typeof data.duration === 'string'
      ? parseInt(data.duration, 10) || 0
      : data.duration;

  return {
    ...data,
    duration,
    ...(videoUrl ? { videoUrl } : {}),
    quiz: buildLessonQuizPayload(quizEnabled, quizQuestions),
  };
};
