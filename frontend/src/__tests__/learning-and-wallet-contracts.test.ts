import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LessonType, WalletTransactionType } from '@/types';
import {
  getHomePathForRole,
  hasStrongPasswordComplexity,
  isValidEmail,
  parseStringArray,
} from '@/utils/helpers';
import {
  isApprovedTeacherProfileStatus,
  isPendingTeacherProfileStatus,
} from '@/utils/teacher-profile';
import {
  deriveInitialCompletedLessonIds,
  getTransactionAmountPresentation,
  resolveWalletDisputeSummary,
} from '@/utils/enrollment';
import {
  normalizeEnrollmentAssets,
  normalizeLiveSessionAssets,
} from '@/utils/asset-normalizers';

describe('out-of-order learning progress recovery and quiz gating (frontend)', () => {
  it('recovers exact non-contiguous completedLessonIds from server instead of slicing first N lessons', () => {
    const lessons = [
      { id: 'l-1', quiz: null },
      { id: 'l-2', quiz: null },
      {
        id: 'l-3',
        quiz: {
          questions: [
            { question: 'Q1', options: ['A', 'B'] },
          ],
        },
      },
      { id: 'l-4', quiz: null },
    ];

    // Student completed Lesson 4 and Lesson 2 out of order (not Lesson 1!), and has NOT passed Lesson 3 quiz
    const completed = deriveInitialCompletedLessonIds(
      lessons,
      {
        id: 'enr-out-of-order',
        completedLessons: 2,
        completedLessonIds: ['l-4', 'l-2', 'l-3'],
      },
      new Set()
    );

    // l-3 is blocked because quiz not passed; l-2 and l-4 are preserved without falsely marking l-1!
    assert.deepEqual([...completed], ['l-4', 'l-2']);
    assert.equal(completed.has('l-1'), false);

    // Once l-3 quiz is passed, l-3 is included
    const afterQuizPass = deriveInitialCompletedLessonIds(
      lessons,
      {
        id: 'enr-out-of-order',
        completedLessons: 3,
        completedLessonIds: ['l-4', 'l-2', 'l-3'],
      },
      new Set(['l-3'])
    );
    assert.equal(afterQuizPass.has('l-3'), true);
    assert.equal(afterQuizPass.has('l-2'), true);
    assert.equal(afterQuizPass.has('l-4'), true);
    assert.equal(afterQuizPass.has('l-1'), false);
  });

  it('normalizes completedLessonIds and live session recordingUrl assets cleanly', () => {
    const normalizedEnrollment = normalizeEnrollmentAssets({
      id: 'enr-1',
      userId: 'u-1',
      packageId: 'pkg-1',
      enrolledAt: '2026-11-20T00:00:00.000Z',
      progress: 50,
      completedLessons: 2,
      completedLessonIds: ['  l-3 ', 'l-1', 'l-3', ''],
      isActive: true,
    });

    assert.deepEqual(normalizedEnrollment.completedLessonIds, ['l-3', 'l-1']);

    const normalizedSession = normalizeLiveSessionAssets({
      id: 'sess-1',
      lessonId: 'l-live',
      title: 'Live Architecture Review',
      scheduledAt: '2026-11-23T10:00:00.000Z',
      duration: 60,
      status: 'COMPLETED',
      recordingUrl: '/uploads/videos/replay-session-1.mp4',
      lesson: {
        id: 'l-live',
        title: 'Live Workshop',
        orderIndex: 1,
        type: LessonType.LIVE,
        isFree: false,
      },
    });

    assert.equal(
      normalizedSession.recordingUrl,
      '/uploads/videos/replay-session-1.mp4'
    );
  });
});

describe('teacher wallet dispute hold & withdrawable balance calculation', () => {
  it('subtracts active refund dispute holds from availableBalance when computing withdrawableBalance', () => {
    const summaryWithHold = resolveWalletDisputeSummary({
      availableBalance: 250,
      reservedForRefunds: 90,
    });

    assert.deepEqual(summaryWithHold, {
      availableBalance: 250,
      reservedForRefunds: 90,
      withdrawableBalance: 160,
    });

    // Never yields negative withdrawable balance even if hold exceeds current available balance
    const fullyHeld = resolveWalletDisputeSummary({
      availableBalance: 40,
      activeRefundHold: 75,
    });

    assert.deepEqual(fullyHeld, {
      availableBalance: 40,
      reservedForRefunds: 75,
      withdrawableBalance: 0,
    });
  });

  it('formats signed ADJUSTMENT wallet transactions accurately alongside CREDIT/DEBIT', () => {
    assert.deepEqual(
      getTransactionAmountPresentation(WalletTransactionType.ADJUSTMENT, -25),
      { amountPrefix: '-', amountClassName: 'text-red-600' }
    );
    assert.deepEqual(
      getTransactionAmountPresentation(WalletTransactionType.ADJUSTMENT, 40),
      { amountPrefix: '+', amountClassName: 'text-emerald-700' }
    );
    assert.deepEqual(
      getTransactionAmountPresentation(WalletTransactionType.DEBIT, 50),
      { amountPrefix: '-', amountClassName: 'text-red-600' }
    );
    assert.deepEqual(
      getTransactionAmountPresentation(WalletTransactionType.CREDIT, 100),
      { amountPrefix: '+', amountClassName: 'text-emerald-700' }
    );
  });
});

describe('shared frontend parsing, teacher status, and form validation helpers', () => {
  it('parses string arrays from native arrays, JSON strings, and optional single-string fallbacks', () => {
    assert.deepEqual(parseStringArray(['  Math ', '', 'Physics  ']), [
      'Math',
      'Physics',
    ]);
    assert.deepEqual(parseStringArray('["Algorithms", "  Systems "]'), [
      'Algorithms',
      'Systems',
    ]);
    assert.deepEqual(parseStringArray('legacy-cert.pdf'), []);
    assert.deepEqual(
      parseStringArray('legacy-cert.pdf', { allowSingleStringFallback: true }),
      ['legacy-cert.pdf']
    );
  });

  it('evaluates teacher profile status predicates and auth form validators consistently', () => {
    assert.equal(isApprovedTeacherProfileStatus('APPROVED'), true);
    assert.equal(isApprovedTeacherProfileStatus('COMPLETE'), true);
    assert.equal(isApprovedTeacherProfileStatus('PENDING_REVIEW'), false);
    assert.equal(isPendingTeacherProfileStatus('PENDING_REVIEW'), true);
    assert.equal(isPendingTeacherProfileStatus(null), false);

    assert.equal(isValidEmail('  student@flexilearn.edu '), true);
    assert.equal(isValidEmail('invalid-email'), false);
    assert.equal(hasStrongPasswordComplexity('StrongPass1'), true);
    assert.equal(hasStrongPasswordComplexity('weakpass1'), false);
    assert.equal(getHomePathForRole('ADMIN'), '/admin');
    assert.equal(getHomePathForRole('TEACHER'), '/teacher');
    assert.equal(getHomePathForRole('STUDENT'), '/student');
    assert.equal(getHomePathForRole(undefined), '/');
  });
});
