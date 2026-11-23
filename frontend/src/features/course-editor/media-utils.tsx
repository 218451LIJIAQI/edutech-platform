import type { ReactNode } from 'react';
import { toStorableBackendAssetPath } from '@/utils/runtime';
import { parseSafeHttpUrl } from '@/utils/safe-url';
import {
  isRecognizedVideoPlatformHost,
  resolveExternalVideoEmbed,
} from '@/utils/video-embed';

/**
 * Returns true only for genuine third-party http(s) URLs.
 * Uploaded backend assets (`/uploads/...` or `<BACKEND_ORIGIN>/uploads/...`)
 * resolve to a relative `/uploads/...` path via `toStorableBackendAssetPath`
 * and must remain in `'upload'` mode rather than `'link'` mode.
 */
export const isExternalMediaLink = (value: string | null | undefined): boolean => {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    return false;
  }

  const storable = toStorableBackendAssetPath(trimmed);
  if (storable.startsWith('/uploads/')) {
    return false;
  }

  return Boolean(parseSafeHttpUrl(storable));
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

  if (isRecognizedVideoPlatformHost(safeUrl)) {
    const embed = resolveExternalVideoEmbed(previewVideoLink);
    if (!embed) {
      return renderUnsupportedPreview();
    }

    return (
      <iframe
        src={embed.embedUrl}
        className="h-full w-full"
        allowFullScreen
        title="Course preview video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
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
