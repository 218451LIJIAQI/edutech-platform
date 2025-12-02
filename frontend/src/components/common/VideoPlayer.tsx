import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  startTime?: number;
}

/**
 * Video Player Component
 * Custom video player with controls
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial time
    if (startTime > 0) {
      video.currentTime = startTime;
    }

    // Auto play if enabled
    if (autoPlay) {
      video.play().catch(() => {
        // Auto-play was prevented
        setIsPlaying(false);
      });
    }

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Report progress
      if (onProgress && video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100;
        onProgress(progress);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onComplete) {
        onComplete();
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [src, autoPlay, startTime, onProgress, onComplete]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          // Fullscreen request failed
        });
      } else {
        // Vendor-prefixed fullscreen APIs for older browsers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vendorContainer = container as HTMLElement & { webkitRequestFullscreen?: () => void; mozRequestFullScreen?: () => void; msRequestFullscreen?: () => void };
        if (vendorContainer.webkitRequestFullscreen) vendorContainer.webkitRequestFullscreen();
        else if (vendorContainer.mozRequestFullScreen) vendorContainer.mozRequestFullScreen();
        else if (vendorContainer.msRequestFullscreen) vendorContainer.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          // Exit fullscreen failed
        });
      } else {
        // Vendor-prefixed exit fullscreen APIs for older browsers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vendorDoc = document as Document & { webkitExitFullscreen?: () => void; mozCancelFullScreen?: () => void; msExitFullscreen?: () => void };
        if (vendorDoc.webkitExitFullscreen) vendorDoc.webkitExitFullscreen();
        else if (vendorDoc.mozCancelFullScreen) vendorDoc.mozCancelFullScreen();
        else if (vendorDoc.msExitFullscreen) vendorDoc.msExitFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full"
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Title */}
        {title && (
          <div className="absolute top-4 left-4 right-4 text-white text-lg font-semibold">
            {title}
          </div>
        )}

        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-4 hover:h-2 transition-all"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Skip Backward */}
            <button
              onClick={() => skip(-10)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Rewind 10 seconds"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(10)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Forward 10 seconds"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Time */}
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Volume"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
            aria-label="Play video"
          >
            <Play className="w-10 h-10 text-gray-900 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
