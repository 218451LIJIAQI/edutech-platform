import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { normalizeErrorResponseData } from '@/services/api';
import {
  normalizeRefund,
  normalizeReportAssets,
  normalizeSupportMessageAssets,
} from '@/utils/asset-normalizers';
import {
  createTokenRefreshCoordinator,
  extractBearerToken,
} from '@/utils/auth-storage';
import { shareLink } from '@/utils/clipboard';
import { extractErrorMessage, extractFieldErrors } from '@/utils/error-handler';
import {
  formatCurrency,
  formatDate,
  formatFileSize,
  roundCurrency,
} from '@/utils/helpers';
import {
  getSocketServerUrl,
  normalizeRequestPath,
  resolveApiRequestUrl,
  resolveBackendAssetUrl,
  shouldAttachAuthHeader,
  toStorableBackendAssetPath,
} from '@/utils/runtime';
import { resolveExternalVideoEmbed } from '@/utils/video-embed';

const setTestViteEnv = (env: Record<string, string>) => {
  (
    globalThis as typeof globalThis & {
      __TEST_IMPORT_META_ENV__?: Record<string, string>;
    }
  ).__TEST_IMPORT_META_ENV__ = env;
};

afterEach(() => {
  setTestViteEnv({});
});

describe('runtime API URL, Socket origin, and auth header resolution', () => {
  it('preserves /api/v1 base path for leading-slash endpoints in both same-origin and split-origin setups', () => {
    const sameOriginResolved = resolveApiRequestUrl(
      '/auth/profile',
      '/api/v1',
      'https://flexilearn.onrender.com'
    );
    assert.equal(
      sameOriginResolved?.toString(),
      'https://flexilearn.onrender.com/api/v1/auth/profile'
    );
    assert.equal(
      shouldAttachAuthHeader(
        '/auth/profile',
        '/api/v1',
        'https://flexilearn.onrender.com'
      ),
      true
    );
    assert.equal(
      normalizeRequestPath(
        '/auth/refresh?retry=1',
        '/api/v1',
        'https://flexilearn.onrender.com'
      ),
      '/auth/refresh'
    );

    const splitOriginResolved = resolveApiRequestUrl(
      '/courses/featured',
      'https://api.example.com/api/v1',
      'https://learn.example.com'
    );
    assert.equal(
      splitOriginResolved?.toString(),
      'https://api.example.com/api/v1/courses/featured'
    );
    assert.equal(
      shouldAttachAuthHeader(
        '/courses/featured',
        'https://api.example.com/api/v1',
        'https://learn.example.com'
      ),
      true
    );
  });

  it('never leaks Authorization headers to third-party origins or protocol-relative URLs', () => {
    assert.equal(
      shouldAttachAuthHeader(
        'https://evil.example.net/api/v1/auth/profile',
        'https://api.example.com/api/v1',
        'https://learn.example.com'
      ),
      false
    );
    assert.equal(
      shouldAttachAuthHeader(
        '//evil.example.net/api/v1/steal',
        '/api/v1',
        'https://flexilearn.onrender.com'
      ),
      false
    );
  });

  it('resolves backend asset previews, socket server origin, and canonical /uploads/... paths in split-origin setups', () => {
    setTestViteEnv({ VITE_API_URL: 'https://api.example.com/api/v1' });

    assert.equal(getSocketServerUrl(), 'https://api.example.com');
    assert.equal(
      resolveBackendAssetUrl('/uploads/thumbnails/course-1.png'),
      'https://api.example.com/uploads/thumbnails/course-1.png'
    );
    assert.equal(
      toStorableBackendAssetPath(
        'https://api.example.com/uploads/thumbnails/course-1.png'
      ),
      '/uploads/thumbnails/course-1.png'
    );
    assert.equal(
      toStorableBackendAssetPath('https://cdn.external.org/banner.webp'),
      'https://cdn.external.org/banner.webp'
    );
  });
});

describe('concurrent 401 token refresh coordinator and shareLink helper', () => {
  it('coalesces simultaneous 401s into a single refresh call and reuses already-rotated tokens without re-refreshing', async () => {
    let currentToken: string | null = 'expired-token-1';
    let refreshCallCount = 0;
    let terminalFailures = 0;

    const coordinator = createTokenRefreshCoordinator({
      getCurrentToken: () => currentToken,
      setCurrentToken: (next) => {
        currentToken = next;
      },
      performRefreshRequest: async () => {
        refreshCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'fresh-token-2';
      },
      onTerminalAuthFailure: () => {
        terminalFailures += 1;
      },
      extractHttpStatus: (err) => (err as { status?: number })?.status,
    });

    assert.equal(extractBearerToken('Bearer expired-token-1'), 'expired-token-1');

    const results = await Promise.all([
      coordinator.acquireFreshToken('expired-token-1'),
      coordinator.acquireFreshToken('expired-token-1'),
      coordinator.acquireFreshToken('expired-token-1'),
      coordinator.acquireFreshToken('expired-token-1'),
    ]);

    assert.deepEqual(results, [
      'fresh-token-2',
      'fresh-token-2',
      'fresh-token-2',
      'fresh-token-2',
    ]);
    assert.equal(refreshCallCount, 1);
    assert.equal(terminalFailures, 0);

    const lateArrivalToken = await coordinator.acquireFreshToken('expired-token-1');
    assert.equal(lateArrivalToken, 'fresh-token-2');
    assert.equal(refreshCallCount, 1);
  });

  it('preserves user session on transient 503/network refresh errors and clears session only on 401/403', async () => {
    let currentToken: string | null = 'token-a';
    let nextFailureStatus = 503;
    let clearedCount = 0;

    const coordinator = createTokenRefreshCoordinator({
      getCurrentToken: () => currentToken,
      setCurrentToken: (next) => {
        currentToken = next;
      },
      performRefreshRequest: async () => {
        const error = new Error('Refresh failed') as Error & { status?: number };
        error.status = nextFailureStatus;
        throw error;
      },
      onTerminalAuthFailure: () => {
        currentToken = null;
        clearedCount += 1;
      },
      extractHttpStatus: (err) => (err as { status?: number })?.status,
    });

    await assert.rejects(() => coordinator.acquireFreshToken('token-a'));
    assert.equal(clearedCount, 0);
    assert.equal(currentToken, 'token-a');

    nextFailureStatus = 401;
    await assert.rejects(() => coordinator.acquireFreshToken('token-a'));
    assert.equal(clearedCount, 1);
    assert.equal(currentToken, null);
  });

  it('handles blank shareLink URLs safely in non-browser environments', async () => {
    assert.equal(await shareLink('   '), 'unavailable');
    assert.equal(await shareLink('https://flexilearn.example.com/community/post/1'), 'unavailable');
  });
});

describe('resolveExternalVideoEmbed', () => {
  it('normalizes YouTube watch/youtu.be/shorts, Vimeo, and Dailymotion URLs with start times', () => {
    const ytShorts = resolveExternalVideoEmbed(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      { startTime: 42, autoPlay: true }
    );
    assert.deepEqual(ytShorts, {
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&start=42&autoplay=1',
    });

    const vimeo = resolveExternalVideoEmbed('https://vimeo.com/channels/staffpicks/123456789', {
      startTime: 15,
    });
    assert.deepEqual(vimeo, {
      provider: 'vimeo',
      videoId: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789#t=15s',
    });

    const dailymotion = resolveExternalVideoEmbed(
      'https://www.dailymotion.com/video/x8abcde_sample-title'
    );
    assert.deepEqual(dailymotion, {
      provider: 'dailymotion',
      videoId: 'x8abcde',
      embedUrl: 'https://www.dailymotion.com/embed/video/x8abcde?autoplay=0',
    });
  });

  it('rejects non-http schemes and lookalike domains', () => {
    assert.equal(resolveExternalVideoEmbed('javascript:alert(1)'), null);
    assert.equal(
      resolveExternalVideoEmbed('https://youtube.com.attacker.example/watch?v=dQw4w9WgXcQ'),
      null
    );
  });
});

describe('shared helpers, asset normalizers, and structured API error preservation', () => {
  it('formats currency without -0 drift, guards invalid dates, and formats file sizes consistently', () => {
    assert.equal(roundCurrency(-0.001), 0);
    assert.equal(Object.is(roundCurrency(-0), -0), false);
    assert.equal(formatCurrency('19.995'), '$20.00');
    assert.equal(formatDate('not-a-valid-date'), 'N/A');
    assert.equal(formatDate(null), 'N/A');
    assert.equal(formatFileSize(0), '0 KB');
    assert.equal(formatFileSize(2048), '2 KB');
    assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.50 MB');
  });

  it('rewrites backend support attachments to protected endpoints while preserving third-party URLs and nested avatars', () => {
    setTestViteEnv({ VITE_API_URL: 'https://api.example.com/api/v1' });

    const internalMsg = normalizeSupportMessageAssets({
      id: 'msg-1',
      ticketId: 'tkt-1',
      senderId: 'u-1',
      message: 'See screenshot',
      attachment: 'https://api.example.com/uploads/support-attachments/screen.png',
      isInternal: false,
      createdAt: '2026-11-23T00:00:00.000Z',
    });
    assert.equal(
      internalMsg.attachment,
      'https://api.example.com/api/v1/support/messages/msg-1/attachment?filename=screen.png'
    );

    const externalMsg = normalizeSupportMessageAssets({
      id: 'msg-2',
      ticketId: 'tkt-1',
      senderId: 'u-1',
      message: 'External mirror',
      attachment: 'https://cdn.partner.org/uploads/support-attachments/guide.pdf',
      isInternal: false,
      createdAt: '2026-11-23T00:00:00.000Z',
    });
    assert.equal(
      externalMsg.attachment,
      'https://cdn.partner.org/uploads/support-attachments/guide.pdf'
    );

    const normalizedRefund = normalizeRefund({
      id: 'ref-1',
      orderId: 'ord-1',
      userId: 'u-1',
      amount: '45.50' as unknown as number,
      reason: 'Schedule conflict',
      refundMethod: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
      createdAt: '2026-11-23T00:00:00.000Z',
      updatedAt: '2026-11-23T00:00:00.000Z',
      order: {
        id: 'ord-1',
        orderNo: 'ORD-1001',
        userId: 'u-1',
        totalAmount: '90.00' as unknown as number,
        status: 'PAID',
        createdAt: '2026-11-23T00:00:00.000Z',
        updatedAt: '2026-11-23T00:00:00.000Z',
        user: {
          id: 'u-1',
          email: 'student@example.com',
          firstName: 'Lin',
          lastName: 'Mei',
          role: 'STUDENT',
          isActive: true,
          avatar: '/uploads/avatars/student.png',
          createdAt: '2026-11-23T00:00:00.000Z',
          updatedAt: '2026-11-23T00:00:00.000Z',
        },
      },
    });
    assert.equal(normalizedRefund.amount, 45.5);
    assert.equal(
      normalizedRefund.order?.user?.avatar,
      'https://api.example.com/uploads/avatars/student.png'
    );

    const normalizedReport = normalizeReportAssets({
      id: 'rep-1',
      reporterId: 'u-1',
      reportedId: 'u-2',
      type: 'HARASSMENT',
      description: 'Spam message',
      status: 'OPEN',
      createdAt: '2026-11-23T00:00:00.000Z',
      updatedAt: '2026-11-23T00:00:00.000Z',
      reporter: {
        id: 'u-1',
        email: 'r1@example.com',
        firstName: 'A',
        lastName: 'B',
        role: 'STUDENT',
        isActive: true,
        avatar: '/uploads/avatars/r1.jpg',
        createdAt: '2026-11-23T00:00:00.000Z',
        updatedAt: '2026-11-23T00:00:00.000Z',
      },
    });
    assert.equal(
      normalizedReport.reporter?.avatar,
      'https://api.example.com/uploads/avatars/r1.jpg'
    );
  });

  it('preserves structured field errors across JSON objects and JSON Blobs in normalizeErrorResponseData', async () => {
    const jsonPayload = {
      status: 'error',
      message: 'Validation failed',
      errors: {
        email: ['Please provide a valid email address'],
        password: ['Password must be at least 8 characters long'],
      },
    };

    const normalizedObj = await normalizeErrorResponseData(jsonPayload);
    const extractedFromObj = extractFieldErrors({
      response: { data: normalizedObj.normalizedData },
    });
    assert.deepEqual(extractedFromObj, {
      email: 'Please enter a valid email address',
      password: 'Password must be at least 8 characters',
    });

    const blobPayload = new Blob([JSON.stringify(jsonPayload)], {
      type: 'application/json; charset=utf-8',
    });
    const normalizedBlob = await normalizeErrorResponseData(blobPayload);
    assert.equal(normalizedBlob.message, 'Validation failed');
    assert.deepEqual(
      extractFieldErrors({ response: { data: normalizedBlob.normalizedData } }),
      {
        email: 'Please enter a valid email address',
        password: 'Password must be at least 8 characters',
      }
    );
    assert.equal(
      extractErrorMessage({ response: { data: normalizedBlob.normalizedData } }),
      'Please enter a valid email address; Password must be at least 8 characters'
    );
  });
});
