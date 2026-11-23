import { useMemo } from 'react';
import {
  CalendarDays,
  ExternalLink,
  Link2,
  MonitorPlay,
  ShieldCheck,
  Users,
} from 'lucide-react';

import VideoPlayer from './VideoPlayer';
import { resolveBackendAssetUrl } from '@/utils/runtime';
import { hasExactHostname, parseSafeHttpUrl } from '@/utils/safe-url';
import {
  isRecognizedVideoPlatformHost,
  resolveExternalVideoEmbed,
} from '@/utils/video-embed';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  startTime?: number;
}

const GOOGLE_MEET_HOSTNAMES = ['meet.google.com'];
const PLACEHOLDER_HOSTNAMES = [
  'example.com',
  'example.org',
  'example.net',
];

const getSafeStartTime = (startTime: number): number =>
  Number.isFinite(startTime) && startTime >= 0 ? Math.floor(startTime) : 0;

const extractMeetCode = (url: URL | null): string | null => {
  if (!url) return null;
  const match = url.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})$/i);
  return match?.[1] ?? null;
};

const isImageUrl = (url: string): boolean => {
  const pathname = url.split(/[?#]/)[0];
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|heic|heif)$/i.test(pathname);
};

const InvalidVideoMessage = ({ message }: { message: string }) => (
  <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-900 px-4 text-center text-white">
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const EmbedShell = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="overflow-hidden rounded-lg bg-black">
    {title && (
      <div className="bg-gray-900 px-4 py-2 text-sm font-medium text-white">
        {title}
      </div>
    )}
    <div className="aspect-video">{children}</div>
  </div>
);

const UniversalVideoPlayer = ({
  src,
  poster,
  title,
  onProgress,
  onComplete,
  autoPlay = false,
  startTime = 0,
}: UniversalVideoPlayerProps) => {
  const trimmedSrc = src.trim();
  const safeStartTime = useMemo(() => getSafeStartTime(startTime), [startTime]);
  const parsedSrc = useMemo(() => parseSafeHttpUrl(trimmedSrc), [trimmedSrc]);
  const externalEmbed = useMemo(
    () =>
      resolveExternalVideoEmbed(trimmedSrc, {
        autoPlay,
        startTime: safeStartTime,
      }),
    [autoPlay, safeStartTime, trimmedSrc]
  );

  const resolvedSrc = useMemo(() => resolveBackendAssetUrl(trimmedSrc), [trimmedSrc]);
  const resolvedPoster = useMemo(
    () => (poster ? resolveBackendAssetUrl(poster) : undefined),
    [poster]
  );

  if (!trimmedSrc) {
    return <InvalidVideoMessage message="Video source is missing." />;
  }

  if (hasExactHostname(parsedSrc, PLACEHOLDER_HOSTNAMES)) {
    return (
      <InvalidVideoMessage message="Video source is a placeholder and has not been configured yet." />
    );
  }

  if (hasExactHostname(parsedSrc, GOOGLE_MEET_HOSTNAMES)) {
    const meetCode = extractMeetCode(parsedSrc);
    const safeExternalSrc = parsedSrc?.toString() ?? '';

    return (
      <div className="relative overflow-hidden rounded-[28px] bg-[#202124] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,133,244,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(52,168,83,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />

        <div className="relative aspect-video px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#34a853]" />
                  Live in Google Meet
                </div>

                <h2 className="max-w-2xl text-2xl font-semibold text-white sm:text-4xl">
                  {title || 'Live lesson room'}
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                  This lesson opens in Google Meet. Join the live room to see the teacher&apos;s shared screen,
                  camera feed, and meeting controls.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-black/20 p-3 sm:block">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-[#3c4043]">
                    <MonitorPlay className="h-8 w-8 text-white/70" />
                  </div>
                  <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-[#2b2c30]">
                    <Users className="h-8 w-8 text-white/60" />
                  </div>
                  <div className="flex h-16 w-28 items-center justify-center rounded-2xl bg-[#2b2c30]">
                    <CalendarDays className="h-7 w-7 text-white/55" />
                  </div>
                  <div className="flex h-16 w-28 items-center justify-center rounded-2xl bg-[#3c4043]">
                    <ShieldCheck className="h-7 w-7 text-white/55" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm sm:p-5">
                <div className="mb-4 flex items-center gap-3 text-white/75">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1a73e8]">
                    <Link2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs uppercase text-white/55">Meeting link</p>
                    <p className="text-sm font-medium text-white/85 sm:text-base">
                      {meetCode || 'Google Meet room'}
                    </p>
                  </div>
                </div>

                <div className="truncate rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-white/80 sm:text-sm">
                  {safeExternalSrc}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#171717]/50 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-xs uppercase text-white/55">Quick action</p>

                <a
                  href={safeExternalSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a73e8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1765cc]"
                >
                  Join in Google Meet
                  <ExternalLink className="h-4 w-4" />
                </a>

                <p className="mt-3 text-sm leading-6 text-white/65">
                  Google Meet usually blocks direct embedding, so this page shows a Meet-style live room preview and opens the real meeting in a new tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isImageUrl(resolvedSrc)) {
    return (
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gray-900">
        {title && (
          <div className="absolute left-0 right-0 top-0 z-10 bg-gray-900/80 px-4 py-2 text-sm font-medium text-white">
            {title}
          </div>
        )}

        <img
          src={resolvedSrc}
          alt={title || 'Lesson content'}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (isRecognizedVideoPlatformHost(parsedSrc)) {
    if (!externalEmbed) {
      return <InvalidVideoMessage message="Invalid external video URL." />;
    }

    return (
      <EmbedShell title={title}>
        <iframe
          src={externalEmbed.embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          title={title || `${externalEmbed.provider} video player`}
        />
      </EmbedShell>
    );
  }

  return (
    <VideoPlayer
      src={resolvedSrc}
      poster={resolvedPoster}
      title={title}
      onProgress={onProgress}
      onComplete={onComplete}
      autoPlay={autoPlay}
      startTime={safeStartTime}
    />
  );
};

export default UniversalVideoPlayer;
