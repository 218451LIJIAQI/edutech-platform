import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
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

describe('runtime API URL and auth header resolution', () => {
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

  it('resolves backend asset previews and strips backend origin back to canonical /uploads/... paths on save', () => {
    setTestViteEnv({ VITE_API_URL: 'https://api.example.com/api/v1' });

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
