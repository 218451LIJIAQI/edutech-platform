import type { Enrollment } from '@/types';

const toTimestamp = (value?: string) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const toExpiryRank = (value?: string) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const compareEnrollments = (left: Enrollment, right: Enrollment) => {
  if (right.progress !== left.progress) {
    return right.progress - left.progress;
  }

  const expiryDifference = toExpiryRank(right.expiresAt) - toExpiryRank(left.expiresAt);
  if (expiryDifference !== 0) {
    return expiryDifference;
  }

  const enrolledAtDifference = toTimestamp(right.enrolledAt) - toTimestamp(left.enrolledAt);
  if (enrolledAtDifference !== 0) {
    return enrolledAtDifference;
  }

  return left.id.localeCompare(right.id);
};

export const selectPreferredCourseEnrollment = (
  enrollments: Enrollment[],
  courseId: string
): Enrollment | null =>
  [...enrollments]
    .filter((enrollment) => enrollment.package?.course?.id === courseId)
    .sort(compareEnrollments)[0] ?? null;

export const getPreferredCourseEnrollments = (enrollments: Enrollment[]): Enrollment[] => {
  const byCourseId = new Map<string, Enrollment>();

  for (const enrollment of enrollments) {
    const courseId = enrollment.package?.course?.id;
    if (!courseId) {
      continue;
    }

    const current = byCourseId.get(courseId);
    if (!current || compareEnrollments(enrollment, current) < 0) {
      byCourseId.set(courseId, enrollment);
    }
  }

  return [...byCourseId.values()].sort((left, right) => compareEnrollments(left, right));
};
