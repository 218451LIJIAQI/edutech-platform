import { getNormalizedHostname, hasExactHostname, parseSafeHttpUrl } from './safe-url';

export type ExternalVideoProvider = 'youtube' | 'vimeo' | 'dailymotion';

export interface ExternalVideoEmbed {
  provider: ExternalVideoProvider;
  videoId: string;
  embedUrl: string;
}

const YOUTUBE_HOSTNAMES = ['youtube.com', 'm.youtube.com', 'youtu.be'] as const;
const VIMEO_HOSTNAMES = ['vimeo.com', 'player.vimeo.com'] as const;
const DAILYMOTION_HOSTNAMES = ['dailymotion.com', 'dai.ly'] as const;

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,15}$/;
const VIMEO_ID_PATTERN = /^\d+$/;
const DAILYMOTION_ID_PATTERN = /^[a-zA-Z0-9]+$/;

const getSafeStartTime = (startTime = 0): number =>
  Number.isFinite(startTime) && startTime > 0 ? Math.floor(startTime) : 0;

export const isRecognizedVideoPlatformHost = (url: URL | null): boolean =>
  hasExactHostname(url, [
    ...YOUTUBE_HOSTNAMES,
    ...VIMEO_HOSTNAMES,
    ...DAILYMOTION_HOSTNAMES,
  ]);

const extractYouTubeId = (url: URL, hostname: string): string | null => {
  const segments = url.pathname.split('/').filter(Boolean);
  let candidate: string | null = null;

  if (hostname === 'youtu.be') {
    candidate = segments[0] ?? null;
  } else if (url.pathname === '/watch') {
    candidate = url.searchParams.get('v');
  } else if (
    (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live') &&
    segments[1]
  ) {
    candidate = segments[1];
  }

  return candidate && YOUTUBE_ID_PATTERN.test(candidate.trim())
    ? candidate.trim()
    : null;
};

const extractVimeoId = (url: URL, hostname: string): string | null => {
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate =
    hostname === 'player.vimeo.com' && segments[0] === 'video'
      ? segments[1]
      : [...segments].reverse().find((segment) => VIMEO_ID_PATTERN.test(segment));

  return candidate && VIMEO_ID_PATTERN.test(candidate.trim())
    ? candidate.trim()
    : null;
};

const extractDailymotionId = (url: URL, hostname: string): string | null => {
  const segments = url.pathname.split('/').filter(Boolean);
  let candidate: string | undefined;

  if (hostname === 'dai.ly') {
    candidate = segments[0];
  } else if (segments[0] === 'video') {
    candidate = segments[1]?.split('_')[0];
  } else if (segments[0] === 'embed' && segments[1] === 'video') {
    candidate = segments[2]?.split('_')[0];
  }

  return candidate && DAILYMOTION_ID_PATTERN.test(candidate.trim())
    ? candidate.trim()
    : null;
};

export const resolveExternalVideoEmbed = (
  rawUrl: string | null | undefined,
  options?: { autoPlay?: boolean; startTime?: number }
): ExternalVideoEmbed | null => {
  const parsed = parseSafeHttpUrl(rawUrl?.trim() || '');
  if (!parsed) {
    return null;
  }

  const hostname = getNormalizedHostname(parsed);
  const autoPlay = Boolean(options?.autoPlay);
  const startTime = getSafeStartTime(options?.startTime);

  if (hasExactHostname(parsed, [...YOUTUBE_HOSTNAMES])) {
    const videoId = extractYouTubeId(parsed, hostname);
    if (!videoId) {
      return null;
    }

    const params = new URLSearchParams({ rel: '0' });
    if (startTime > 0) {
      params.set('start', String(startTime));
    }
    if (autoPlay) {
      params.set('autoplay', '1');
    }

    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`,
    };
  }

  if (hasExactHostname(parsed, [...VIMEO_HOSTNAMES])) {
    const videoId = extractVimeoId(parsed, hostname);
    if (!videoId) {
      return null;
    }

    const query = autoPlay ? '?autoplay=1' : '';
    const hash = startTime > 0 ? `#t=${startTime}s` : '';

    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(videoId)}${query}${hash}`,
    };
  }

  if (hasExactHostname(parsed, [...DAILYMOTION_HOSTNAMES])) {
    const videoId = extractDailymotionId(parsed, hostname);
    if (!videoId) {
      return null;
    }

    const params = new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      ...(startTime > 0 ? { start: String(startTime) } : {}),
    });

    return {
      provider: 'dailymotion',
      videoId,
      embedUrl: `https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}?${params.toString()}`,
    };
  }

  return null;
};
