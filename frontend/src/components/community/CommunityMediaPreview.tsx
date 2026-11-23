import type { CommunityMedia } from '@/types/community';
import { resolveBackendAssetUrl } from '@/utils/runtime';
import { resolveExternalVideoEmbed } from '@/utils/video-embed';

interface CommunityMediaPreviewProps {
  media: CommunityMedia;
  title?: string;
  className?: string;
  interactive?: boolean;
}

/**
 * Renders a community post image, embedded external video (YouTube/Vimeo/Dailymotion),
 * or uploaded HTML5 video consistently across feed cards and the post editor.
 */
export default function CommunityMediaPreview({
  media,
  title,
  className = 'w-full h-full object-cover',
  interactive = false,
}: CommunityMediaPreviewProps) {
  const resolvedUrl = resolveBackendAssetUrl(media.url) || media.url;
  const fallbackLabel = title?.trim() ? `${title.trim()} media` : 'Community post media';

  if (media.type === 'image') {
    return (
      <img
        src={resolvedUrl}
        alt={fallbackLabel}
        className={className}
        loading="lazy"
      />
    );
  }

  const externalEmbed = resolveExternalVideoEmbed(resolvedUrl);
  if (externalEmbed) {
    return (
      <iframe
        src={externalEmbed.embedUrl}
        title={fallbackLabel}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={interactive}
        className={`${className} border-0 ${interactive ? '' : 'pointer-events-none'}`}
      />
    );
  }

  return (
    <video
      src={resolvedUrl}
      title={fallbackLabel}
      aria-label={fallbackLabel}
      className={className}
      controls={interactive}
      muted={!interactive}
      playsInline
      preload="metadata"
    />
  );
}
