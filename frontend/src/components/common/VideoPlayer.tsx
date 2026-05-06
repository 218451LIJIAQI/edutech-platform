import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  startTime?: number;
}

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
};

const SKIP_SECONDS = 10;
const CONTROL_HIDE_DELAY = 2500;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '0:00';

  const totalSeconds = Math.floor(time);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Video Player Component
 * Custom accessible video player with playback, progress, volume, skip, and fullscreen controls.
 */
const VideoPlayer = ({
  src,
  poster,
  title,
  onProgress,
  onComplete,
  autoPlay = false,
  startTime = 0,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hasCompletedRef = useRef(false);

  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimer();

    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    hideControlsTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, CONTROL_HIDE_DELAY);
  }, [clearHideControlsTimer, isPlaying]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => {
    scheduleHideControls();

    return () => {
      clearHideControlsTimer();
    };
  }, [scheduleHideControls, clearHideControlsTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    hasCompletedRef.current = false;
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const safeStartTime = Math.max(0, startTime);

    const handleLoadedMetadata = () => {
      const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;

      setDuration(videoDuration);
      setIsLoading(false);

      if (safeStartTime > 0 && videoDuration > 0) {
        video.currentTime = clamp(safeStartTime, 0, videoDuration);
      }
    };

    const handleTimeUpdate = () => {
      const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
      const videoCurrentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;

      setCurrentTime(videoCurrentTime);
      setDuration(videoDuration);

      if (videoDuration > 0) {
        const progress = clamp((videoCurrentTime / videoDuration) * 100, 0, 100);
        onProgressRef.current?.(progress);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);

      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    if (autoPlay) {
      video.play().catch(() => {
        setIsPlaying(false);
        setShowControls(true);
      });
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [src, autoPlay, startTime]);

  useEffect(() => {
    const getFullscreenElement = () => {
      const vendorDocument = document as FullscreenCapableDocument;

      return (
        document.fullscreenElement ||
        vendorDocument.webkitFullscreenElement ||
        vendorDocument.mozFullScreenElement ||
        vendorDocument.msFullscreenElement ||
        null
      );
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement()));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setIsPlaying(false);
      setShowControls(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextMutedState = !video.muted;
    video.muted = nextMutedState;
    setIsMuted(nextMutedState);
  }, []);

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = clamp(Number(event.target.value), 0, 1);

    video.volume = newVolume;
    video.muted = newVolume === 0;

    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || duration <= 0) return;

      const newTime = clamp(time, 0, duration);
      video.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const handleProgressClick = (event: MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current;
    if (!progressBar || duration <= 0) return;

    const rect = progressBar.getBoundingClientRect();
    const position = clamp((event.clientX - rect.left) / rect.width, 0, 1);

    seekTo(position * duration);
  };

  const handleProgressKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        seekTo(currentTime - 5);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        seekTo(currentTime + 5);
        break;
      case 'Home':
        event.preventDefault();
        seekTo(0);
        break;
      case 'End':
        event.preventDefault();
        seekTo(duration);
        break;
      default:
        break;
    }
  };

  const skip = useCallback(
    (seconds: number) => {
      seekTo(currentTime + seconds);
    },
    [currentTime, seekTo]
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => undefined);
        return;
      }

      const vendorContainer = container as FullscreenCapableElement;

      if (vendorContainer.webkitRequestFullscreen) vendorContainer.webkitRequestFullscreen();
      else if (vendorContainer.mozRequestFullScreen) vendorContainer.mozRequestFullScreen();
      else if (vendorContainer.msRequestFullscreen) vendorContainer.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
        return;
      }

      const vendorDocument = document as FullscreenCapableDocument;

      if (vendorDocument.webkitExitFullscreen) vendorDocument.webkitExitFullscreen();
      else if (vendorDocument.mozCancelFullScreen) vendorDocument.mozCancelFullScreen();
      else if (vendorDocument.msExitFullscreen) vendorDocument.msExitFullscreen();
    }
  }, [isFullscreen]);

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
      case 'k':
        event.preventDefault();
        togglePlay();
        break;
      case 'm':
        event.preventDefault();
        toggleMute();
        break;
      case 'f':
        event.preventDefault();
        toggleFullscreen();
        break;
      case 'arrowleft':
        event.preventDefault();
        skip(-SKIP_SECONDS);
        break;
      case 'arrowright':
        event.preventDefault();
        skip(SKIP_SECONDS);
        break;
      default:
        break;
    }
  };

  const progress = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;

  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-lg bg-black"
      onMouseEnter={revealControls}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onFocus={revealControls}
      onKeyDown={handleContainerKeyDown}
      tabIndex={0}
      aria-label={title ? `${title} video player` : 'Video player'}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        title={title || 'Video player'}
        className="h-full w-full"
        onClick={togglePlay}
        preload="metadata"
        playsInline
      >
        Your browser does not support the video tag.
      </video>

      {title && (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 text-lg font-semibold text-white drop-shadow">
          {title}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" aria-live="polite">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"
            aria-label="Loading video"
            role="status"
          />
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          ref={progressBarRef}
          className="mb-4 h-1 w-full cursor-pointer rounded-full bg-white/30 transition-all hover:h-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          onClick={handleProgressClick}
          onKeyDown={handleProgressKeyDown}
          role="slider"
          tabIndex={0}
          aria-label="Video progress"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.floor(duration))}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>

            <button
              type="button"
              onClick={() => skip(-SKIP_SECONDS)}
              className="rounded-full p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={`Rewind ${SKIP_SECONDS} seconds`}
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => skip(SKIP_SECONDS)}
              className="rounded-full p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={`Forward ${SKIP_SECONDS} seconds`}
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="text-sm font-medium" aria-live="off">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-full p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={isMuted || volume === 0 ? 'Unmute video' : 'Mute video'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-white"
                aria-label="Volume"
              />
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 transition-all hover:scale-110 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            aria-label="Play video"
          >
            <Play className="ml-1 h-10 w-10 text-gray-900" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;