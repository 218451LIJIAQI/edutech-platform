import type { Lesson, LessonType } from '@/types';

export interface LessonModalProps {
  courseId: string;
  lessonId?: string;
  initialLesson?: Lesson;
  defaultVideoType?: VideoSourceType;
  onClose: () => void;
  onSuccess: () => void;
}

export interface LessonFormData {
  title: string;
  description: string;
  type: LessonType;
  duration: number | string;
  isFree: boolean;
}

export interface EditableQuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export type VideoSourceType = 'upload' | 'link';
