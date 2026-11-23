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

export const isEnrollmentActiveNow = (
  enrollment: Pick<Enrollment, 'isActive' | 'expiresAt'>,
  referenceTimestamp = Date.now()
): boolean => {
  if (!enrollment.isActive) {
    return false;
  }

  if (!enrollment.expiresAt) {
    return true;
  }

  const expiry = new Date(enrollment.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > referenceTimestamp;
};

const compareEnrollments = (
  left: Enrollment,
  right: Enrollment,
  referenceTimestamp: number
) => {
  const leftActive = isEnrollmentActiveNow(left, referenceTimestamp) ? 1 : 0;
  const rightActive = isEnrollmentActiveNow(right, referenceTimestamp) ? 1 : 0;
  if (rightActive !== leftActive) {
    return rightActive - leftActive;
  }

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
  courseId: string,
  referenceTimestamp = Date.now()
): Enrollment | null =>
  [...enrollments]
    .filter((enrollment) => enrollment.package?.course?.id === courseId)
    .sort((left, right) => compareEnrollments(left, right, referenceTimestamp))[0] ?? null;

export const getPreferredCourseEnrollments = (
  enrollments: Enrollment[],
  referenceTimestamp = Date.now()
): Enrollment[] => {
  const byCourseId = new Map<string, Enrollment>();

  for (const enrollment of enrollments) {
    const courseId = enrollment.package?.course?.id;
    if (!courseId) {
      continue;
    }

    const current = byCourseId.get(courseId);
    if (!current || compareEnrollments(enrollment, current, referenceTimestamp) < 0) {
      byCourseId.set(courseId, enrollment);
    }
  }

  return [...byCourseId.values()].sort((left, right) =>
    compareEnrollments(left, right, referenceTimestamp)
  );
};
