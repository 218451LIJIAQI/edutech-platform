import type { Course, QuizAttempt } from '@/types';
import type { QuizMetrics } from './types';

export const getCourseEnrollmentCount = (course: Course) => {
  if (
    typeof course === 'object' &&
    '_count' in course &&
    course._count &&
    typeof course._count === 'object' &&
    'enrollments' in course._count
  ) {
    return course._count.enrollments as number;
  }

  return 0;
};

export const buildQuizMetrics = (
  course: Course,
  quizAttempts: QuizAttempt[]
): QuizMetrics => {
  const quizLessons = (course.lessons || [])
    .filter((lesson) => lesson.quiz?.questions?.length)
    .sort((left, right) => left.orderIndex - right.orderIndex);
  const uniqueQuizStudents = new Set(
    quizAttempts.map((attempt) => attempt.student.id)
  ).size;
  const averageQuizScore = quizAttempts.length
    ? Math.round(
        quizAttempts.reduce((sum, attempt) => sum + attempt.scorePercentage, 0) /
          quizAttempts.length
      )
    : 0;
  const passRate = quizAttempts.length
    ? Math.round(
        (quizAttempts.filter((attempt) => attempt.passed).length /
          quizAttempts.length) *
          100
      )
    : 0;

  return {
    quizLessons,
    uniqueQuizStudents,
    averageQuizScore,
    passRate,
  };
};
