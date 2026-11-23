import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import axios from 'axios';
import {
  buildPackageSavePayload,
  calculatePackageFinalPrice,
} from '@/features/course-editor/package-persistence';
import api, { refreshAccessToken } from '@/services/api';
import {
  UPLOAD_FOLDERS,
  validateUploadFileForFolder,
} from '@/services/upload.service';
import { OrderStatus } from '@/types';
import {
  clearAuthStorage,
  getAccessToken,
  storeAccessToken,
} from '@/utils/auth-storage';
import {
  normalizeEnrollmentAssets,
  normalizeLiveSessionAssets,
  normalizeOrder,
} from '@/utils/asset-normalizers';
import { copyTextToClipboard, shareLink } from '@/utils/clipboard';
import {
  getCourseLessonCount,
  getCourseMaterialCount,
} from '@/utils/course-counts';

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'navigator'
);

afterEach(() => {
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    delete (globalThis as { navigator?: unknown }).navigator;
  }
  clearAuthStorage();
});

describe('free package persistence, upload MIME pairing, and shared frontend contracts', () => {
  it('supports $0 free packages and rejects negative prices or discounts exceeding price', () => {
    assert.equal(calculatePackageFinalPrice(0, 0), 0);

    const freePkg = buildPackageSavePayload(
      {
        name: '  Community Starter  ',
        description: 'Free introductory access',
        price: 0,
        discount: 0,
        duration: 14,
        maxStudents: 200,
      },
      ['Community Q&A', 'Starter Workbook']
    );

    assert.deepEqual(freePkg, {
      name: 'Community Starter',
      description: 'Free introductory access',
      price: 0,
      discount: 0,
      finalPrice: 0,
      duration: 14,
      maxStudents: 200,
      features: ['Community Q&A', 'Starter Workbook'],
    });

    assert.throws(
      () =>
        buildPackageSavePayload(
          {
            name: 'Invalid',
            description: '',
            price: 10,
            discount: 15,
            duration: 30,
            maxStudents: 10,
          },
          ['Feature']
        ),
      /Discount cannot exceed price/
    );
  });

  it('enforces strict extension-to-MIME pairing in frontend upload validation', () => {
    assert.doesNotThrow(() =>
      validateUploadFileForFolder(
        { name: 'slides.pdf', type: 'application/pdf', size: 1024 },
        UPLOAD_FOLDERS.DOCUMENTS
      )
    );

    assert.throws(
      () =>
        validateUploadFileForFolder(
          { name: 'photo.png', type: 'application/pdf', size: 1024 },
          UPLOAD_FOLDERS.GENERAL
        ),
      /not allowed or does not match extension/
    );

    assert.throws(
      () =>
        validateUploadFileForFolder(
          { name: 'lecture.mp4', type: 'video/webm', size: 1024 },
          UPLOAD_FOLDERS.VIDEOS
        ),
      /not allowed or does not match extension/
    );
  });

  it('handles shareLink Web Share API success, AbortError cancellation, and clipboard fallback', async () => {
    assert.equal(await shareLink('   '), 'unavailable');
    assert.equal(await copyTextToClipboard('   '), false);

    let sharedPayload: unknown = null;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        share: async (data: unknown) => {
          sharedPayload = data;
        },
      },
    });

    assert.equal(
      await shareLink('https://flexilearn.example/posts/1', {
        title: 'Post 1',
      }),
      'shared'
    );
    assert.deepEqual(sharedPayload, {
      title: 'Post 1',
      text: undefined,
      url: 'https://flexilearn.example/posts/1',
    });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        share: async () => {
          const abortErr = new Error('User cancelled');
          abortErr.name = 'AbortError';
          throw abortErr;
        },
      },
    });
    assert.equal(
      await shareLink('https://flexilearn.example/posts/1'),
      'cancelled'
    );

    let copiedText = '';
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: async (value: string) => {
            copiedText = value;
          },
        },
      },
    });
    assert.equal(
      await shareLink('  https://flexilearn.example/posts/2  '),
      'copied'
    );
    assert.equal(copiedText, 'https://flexilearn.example/posts/2');
  });

  it('handles null/undefined courses in course-counts and normalizes completedLessonIds, live sessions, and refundableAmount', () => {
    assert.equal(getCourseLessonCount(null), 0);
    assert.equal(getCourseMaterialCount(undefined), 0);
    assert.equal(
      getCourseLessonCount({
        _count: { lessons: 7 },
        lessons: [],
      }),
      7
    );

    const normalizedEnrollment = normalizeEnrollmentAssets({
      id: 'enr-1',
      userId: 'u-1',
      packageId: 'pkg-1',
      enrolledAt: '2026-05-01T00:00:00.000Z',
      progress: 50,
      completedLessons: 2,
      completedLessonIds: [' lesson-4 ', 'lesson-2', 'lesson-4', ''],
      isActive: true,
    });
    assert.deepEqual(normalizedEnrollment.completedLessonIds, [
      'lesson-4',
      'lesson-2',
    ]);

    const normalizedSession = normalizeLiveSessionAssets({
      id: 'ls-1',
      lessonId: 'lesson-1',
      title: 'Architecture Q&A',
      scheduledAt: '2026-06-01T12:00:00.000Z',
      duration: 60,
      maxParticipants: 80,
      status: 'COMPLETED',
      recordingUrl: '/uploads/videos/replay.mp4',
    });
    assert.equal(normalizedSession.duration, 60);
    assert.equal(normalizedSession.maxParticipants, 80);
    assert.match(normalizedSession.recordingUrl ?? '', /\/uploads\/videos\/replay\.mp4$/);

    const normalizedOrder = normalizeOrder({
      id: 'ord-1',
      orderNo: 'ORD-1',
      userId: 'u-1',
      totalAmount: 100,
      refundAmount: 40,
      refundableAmount: 60,
      status: OrderStatus.PAID,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    assert.equal(normalizedOrder.refundableAmount, 60);
  });

  it('coalesces concurrent token refreshes, retries late stale-token 401s without re-refreshing, and preserves session on 503', async () => {
    storeAccessToken('stale-token-v1');

    let refreshCallCount = 0;
    (axios.defaults as { adapter?: unknown }).adapter = async () => {
      refreshCallCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return {
        status: 200,
        data: { data: { accessToken: 'fresh-token-v2' } },
      };
    };

    // Simulate two concurrent requests sent with `stale-token-v1`, where the second
    // 401 arrives AFTER the first already refreshed the token to `fresh-token-v2`.
    let apiCallCount = 0;
    (api.defaults as { adapter?: unknown }).adapter = async (reqConfig: {
      url?: string;
      headers?: { Authorization?: string };
    }) => {
      apiCallCount += 1;
      if (reqConfig.headers?.Authorization === 'Bearer stale-token-v1') {
        if (reqConfig.url === '/slow-endpoint') {
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        const err = new Error('Unauthorized') as Error & {
          isAxiosError: boolean;
          config: unknown;
          response: { status: number; data: { message: string } };
        };
        err.isAxiosError = true;
        err.config = reqConfig;
        err.response = { status: 401, data: { message: 'Token expired' } };
        throw err;
      }

      return {
        status: 200,
        data: { ok: true, usedAuth: reqConfig.headers?.Authorization },
      };
    };

    const [fastRes, slowRes] = await Promise.all([
      api.get('/fast-endpoint'),
      api.get('/slow-endpoint'),
    ]);

    assert.equal(refreshCallCount, 1);
    assert.equal(apiCallCount, 4);
    assert.equal(fastRes.data.usedAuth, 'Bearer fresh-token-v2');
    assert.equal(slowRes.data.usedAuth, 'Bearer fresh-token-v2');
    assert.equal(getAccessToken(), 'fresh-token-v2');

    // Transient 503 on refresh must NOT wipe the stored access token
    (axios.defaults as { adapter?: unknown }).adapter = async () => {
      const serverErr = new Error('Service Unavailable') as Error & {
        isAxiosError: boolean;
        response: { status: number };
      };
      serverErr.isAxiosError = true;
      serverErr.response = { status: 503 };
      throw serverErr;
    };

    await assert.rejects(() => refreshAccessToken(), /Service Unavailable/);
    assert.equal(getAccessToken(), 'fresh-token-v2');
  });
});
