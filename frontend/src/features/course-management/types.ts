import type { Course } from '@/types';

export type CourseManagementTabId =
  | 'overview'
  | 'live'
  | 'notifications'
  | 'materials'
  | 'recordings'
  | 'quizzes';

export interface RecordingPendingDelete {
  id: string;
  title: string;
}

export interface QuizMetrics {
  quizLessons: NonNullable<Course['lessons']>;
  uniqueQuizStudents: number;
  averageQuizScore: number;
  passRate: number;
}

export interface NotificationDraft {
  title: string;
  message: string;
}

export interface NotificationDispatchSummary {
  title: string;
  message: string;
  recipients: number;
  sentAt: string;
}
