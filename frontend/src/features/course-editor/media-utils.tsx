import type { ReactNode } from 'react';
import {
  getNormalizedHostname,
  hasExactHostname,
  parseSafeHttpUrl,
} from '@/utils/safe-url';

const YOUTUBE_HOSTNAMES = ['youtube.com', 'm.youtube.com', 'youtu.be'] as const;
const VIMEO_HOSTNAMES = ['vimeo.com', 'player.vimeo.com'] as const;

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;
const VIMEO_VIDEO_ID_PATTERN = /^\d+$/;

export const isExternalMediaLink = (value: string | null | undefined): boolean =>
  Boolean(parseSafeHttpUrl(value?.trim() || ''));

const getPathSegments = (url: URL | null): string[] =>
  url?.pathname.split('/').filter(Boolean) || [];

const sanitizeYouTubeVideoId = (value: string | null | undefined): string => {
  const videoId = (value || '').trim();

  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : '';
};

const sanitizeVimeoVideoId = (value: string | null | undefined): string => {
  const videoId = (value || '').trim();

  return VIMEO_VIDEO_ID_PATTERN.test(videoId) ? videoId : '';
};

const getYouTubeVideoId = (url: URL | null): string => {
  if (!url) {
    return '';
  }

  const normalizedHostname = getNormalizedHostname(url);
  const segments = getPathSegments(url);

  if (normalizedHostname === 'youtu.be') {
    return sanitizeYouTubeVideoId(segments[0]);
  }

  if (normalizedHostname !== 'youtube.com' && normalizedHostname !== 'm.youtube.com') {
    return '';
  }

  if (url.pathname === '/watch') {
    return sanitizeYouTubeVideoId(url.searchParams.get('v'));
  }

  if ((segments[0] === 'embed' || segments[0] === 'shorts') && segments[1]) {
    return sanitizeYouTubeVideoId(segments[1]);
  }

  return '';
};

const getVimeoVideoId = (url: URL | null): string => {
  if (!url) {
    return '';
  }

  const normalizedHostname = getNormalizedHostname(url);
  const segments = getPathSegments(url);

  if (normalizedHostname === 'player.vimeo.com') {
    return segments[0] === 'video' ? sanitizeVimeoVideoId(segments[1]) : '';
  }

  if (normalizedHostname !== 'vimeo.com' || segments.length === 0) {
    return '';
  }

  return sanitizeVimeoVideoId(segments[segments.length - 1]);
};

const renderUnsupportedPreview = (): ReactNode => (
  <div
    className="flex h-full w-full items-center justify-center rounded-xl bg-gray-100 px-4 text-center text-sm font-medium text-gray-500"
    role="status"
  >
    Preview video is unavailable or the link is invalid.
  </div>
);

export const renderPreviewVideo = (previewVideoLink: string): ReactNode => {
  const safeUrl = parseSafeHttpUrl(previewVideoLink.trim());

  if (!safeUrl) {
    return renderUnsupportedPreview();
  }

  if (hasExactHostname(safeUrl, [...YOUTUBE_HOSTNAMES])) {
    const videoId = getYouTubeVideoId(safeUrl);

    if (videoId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
          className="h-full w-full"
          allowFullScreen
          title="Course preview video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }

    return renderUnsupportedPreview();
  }

  if (hasExactHostname(safeUrl, [...VIMEO_HOSTNAMES])) {
    const videoId = getVimeoVideoId(safeUrl);

    if (videoId) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${encodeURIComponent(videoId)}`}
          className="h-full w-full"
          allowFullScreen
          title="Course preview video"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }

    return renderUnsupportedPreview();
  }

  return (
    <video
      src={safeUrl.toString()}
      title="Course preview video"
      aria-label="Course preview video"
      controls
      preload="metadata"
      playsInline
      className="h-full w-full"
    />
  );
};
