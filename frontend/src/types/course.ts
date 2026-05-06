import { CourseType, LessonType } from './enums';
import type { TeacherProfile } from './teacher';
import type { User } from './user';

export interface Course {
  readonly id: string;
  readonly teacherProfileId: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly courseType: CourseType;
  readonly thumbnail?: string;
  readonly previewVideoUrl?: string;
  readonly isPublished: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly teacherProfile?: TeacherProfile;
  readonly lessons?: Lesson[];
  readonly packages?: LessonPackage[];
  readonly materials?: Material[];
  readonly isEnrolled?: boolean;
  readonly _count?: {
    readonly enrollments?: number;
    readonly lessons?: number;
    readonly materials?: number;
  };
}

export interface QuizQuestion {
  readonly question: string;
  readonly options: string[];
  readonly correctOptionIndex?: number;
  readonly explanation?: string;
}

export interface LessonQuiz {
  readonly questions: QuizQuestion[];
}

export interface Lesson {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly type: LessonType;
  readonly duration?: number;
  readonly videoUrl?: string;
  readonly quiz?: LessonQuiz | null;
  readonly orderIndex: number;
  readonly isFree: boolean;
}

export interface QuizSubmissionResultItem {
  readonly question: string;
  readonly options: string[];
  readonly selectedOptionIndex: number;
  readonly correctOptionIndex: number;
  readonly isCorrect: boolean;
  readonly explanation?: string;
}

export interface QuizSubmissionResult {
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly totalQuestions: number;
  readonly correctAnswers: number;
  readonly scorePercentage: number;
  readonly passPercentage: number;
  readonly passed: boolean;
  readonly results: QuizSubmissionResultItem[];
}

export interface QuizAttempt {
  readonly id: string;
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly lessonOrderIndex: number;
  readonly student: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  readonly scorePercentage: number;
  readonly correctAnswers: number;
  readonly totalQuestions: number;
  readonly passed: boolean;
  readonly submittedAt: string;
  readonly results: QuizSubmissionResultItem[];
}

export interface LessonPackage {
  readonly id: string;
  readonly courseId: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly discount?: number;
  readonly finalPrice: number;
  readonly duration?: number;
  readonly maxStudents?: number;
  readonly features?: string[];
  readonly isActive: boolean;
}

export interface Enrollment {
  readonly id: string;
  readonly userId: string;
  readonly packageId: string;
  readonly enrolledAt: string;
  readonly expiresAt?: string;
  readonly progress: number;
  readonly completedLessons: number;
  readonly isActive: boolean;
  readonly package?: LessonPackage & { course?: Course };
}

export interface Material {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly fileUrl?: string;
  readonly accessUrl?: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly isDownloadable: boolean;
  readonly uploadedAt: string;
}
