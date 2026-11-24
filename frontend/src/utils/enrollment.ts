import { WalletTransactionType } from '@/types';
import type { Enrollment, Lesson, WalletSummary } from '@/types';

const COMPLETED_LESSONS_STORAGE_PREFIX = 'flexilearn:completed-lessons:';

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

const isEnrollmentActiveNow = (
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

const readStoredCompletedLessonIds = (enrollmentId: string): string[] | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(`${COMPLETED_LESSONS_STORAGE_PREFIX}${enrollmentId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : null;
  } catch {
    return null;
  }
};

export const writeStoredCompletedLessonIds = (
  enrollmentId: string,
  lessonIds: Iterable<string>
): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      `${COMPLETED_LESSONS_STORAGE_PREFIX}${enrollmentId}`,
      JSON.stringify(Array.from(lessonIds))
    );
  } catch {
    // Ignore storage quota errors
  }
};

export const deriveInitialCompletedLessonIds = (
  lessons: Array<Pick<Lesson, 'id' | 'quiz'>>,
  enrollment: Pick<Enrollment, 'id' | 'completedLessons' | 'completedLessonIds'> | null,
  passedLessonIds: ReadonlySet<string>
): Set<string> => {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const completed = new Set<string>();

  const addIfEligible = (lessonId: string) => {
    const lesson = lessonById.get(lessonId);
    if (!lesson) return;
    const requiresQuiz = Boolean(lesson.quiz?.questions?.length);
    if (!requiresQuiz || passedLessonIds.has(lessonId)) {
      completed.add(lessonId);
    }
  };

  for (const lessonId of passedLessonIds) {
    if (lessonById.has(lessonId)) {
      completed.add(lessonId);
    }
  }

  if (!enrollment) {
    return completed;
  }

  const serverIds = Array.isArray(enrollment.completedLessonIds)
    ? enrollment.completedLessonIds
    : null;

  if (serverIds && serverIds.length > 0) {
    for (const lessonId of serverIds) {
      addIfEligible(lessonId);
    }
    return completed;
  }

  if (serverIds && serverIds.length === 0 && enrollment.completedLessons === 0) {
    return completed;
  }

  const stored = readStoredCompletedLessonIds(enrollment.id);
  if (stored) {
    for (const lessonId of stored) {
      addIfEligible(lessonId);
    }
  }

  const targetCount = Math.min(enrollment.completedLessons, lessons.length);
  if (completed.size < targetCount) {
    for (const lesson of lessons) {
      if (completed.size >= targetCount) break;
      addIfEligible(lesson.id);
    }
  }

  return completed;
};

export const resolveWalletDisputeSummary = (
  summary?: Pick<
    WalletSummary,
    'availableBalance' | 'activeRefundHold' | 'reservedForRefunds' | 'withdrawableBalance'
  > | null
): {
  availableBalance: number;
  reservedForRefunds: number;
  withdrawableBalance: number;
} => {
  const availableBalance = Math.max(0, Number((summary?.availableBalance || 0).toFixed(2)));
  const reservedForRefunds = Math.max(
    0,
    Number((summary?.reservedForRefunds ?? summary?.activeRefundHold ?? 0).toFixed(2))
  );
  const withdrawableBalance =
    summary?.withdrawableBalance !== undefined
      ? Math.max(0, Number(summary.withdrawableBalance.toFixed(2)))
      : Math.max(0, Number((availableBalance - reservedForRefunds).toFixed(2)));

  return {
    availableBalance,
    reservedForRefunds,
    withdrawableBalance,
  };
};

export const getTransactionAmountPresentation = (
  type: WalletTransactionType,
  amount = 0
): { amountPrefix: '+' | '-'; amountClassName: string } => {
  switch (type) {
    case WalletTransactionType.CREDIT:
    case WalletTransactionType.UNFREEZE:
      return {
        amountPrefix: '+',
        amountClassName: 'text-emerald-700',
      };
    case WalletTransactionType.ADJUSTMENT:
      return amount < 0
        ? {
            amountPrefix: '-',
            amountClassName: 'text-red-600',
          }
        : {
            amountPrefix: '+',
            amountClassName: 'text-emerald-700',
          };
    case WalletTransactionType.DEBIT:
    case WalletTransactionType.FREEZE:
      return {
        amountPrefix: '-',
        amountClassName: 'text-red-600',
      };
    default:
      return {
        amountPrefix: '+',
        amountClassName: 'text-slate-700',
      };
  }
};
