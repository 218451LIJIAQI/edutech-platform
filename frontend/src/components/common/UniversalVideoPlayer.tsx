import VideoPlayer from './VideoPlayer';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  startTime?: number;
}

/**
 * Universal Video Player Component
 * Supports local videos, YouTube, Vimeo, and other external video links
 */
const UniversalVideoPlayer = ({
  src,
  poster,
  title,
  onProgress,
  onComplete,
  autoPlay = false,
  startTime = 0,
}: UniversalVideoPlayerProps) => {
  const resolveAssetUrl = (path?: string) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const origin = apiUrl.replace(/\/api(\/.*)?$/i, '');
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const resolvedSrc = resolveAssetUrl(src);
  const resolvedPoster = poster ? resolveAssetUrl(poster) : undefined;
  // Helper function to extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Helper function to extract Vimeo video ID
  const getVimeoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };

  // Determine video type and render appropriate player
  if (src.includes('youtube.com') || src.includes('youtu.be')) {
    // YouTube video
    const videoId = getYouTubeId(src);
    if (!videoId) {
      return (
        <div className="aspect-video bg-gray-900 flex items-center justify-center text-white rounded-lg">
          <p>Invalid YouTube URL</p>
        </div>
      );
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}?${autoPlay ? 'autoplay=1&' : ''}start=${startTime}&rel=0`;

    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {title && (
          <div className="bg-gray-900 text-white px-4 py-2 text-sm font-medium">
            {title}
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Video'}
        />
      </div>
    );
  } else if (src.includes('vimeo.com')) {
    // Vimeo video
    const videoId = getVimeoId(src);
    if (!videoId) {
      return (
        <div className="aspect-video bg-gray-900 flex items-center justify-center text-white rounded-lg">
          <p>Invalid Vimeo URL</p>
        </div>
      );
    }

    const embedUrl = `https://player.vimeo.com/video/${videoId}?${autoPlay ? 'autoplay=1&' : ''}#t=${startTime}s`;

    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {title && (
          <div className="bg-gray-900 text-white px-4 py-2 text-sm font-medium">
            {title}
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title || 'Video'}
        />
      </div>
    );
  } else if (src.includes('dailymotion.com')) {
    // Dailymotion video
    const match = src.match(/dailymotion\.com\/video\/([^_]+)/);
    const videoId = match ? match[1] : null;
    
    if (!videoId) {
      return (
        <div className="aspect-video bg-gray-900 flex items-center justify-center text-white rounded-lg">
          <p>Invalid Dailymotion URL</p>
        </div>
      );
    }

    const embedUrl = `https://www.dailymotion.com/embed/video/${videoId}?autoplay=${autoPlay ? 1 : 0}&start=${startTime}`;

    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {title && (
          <div className="bg-gray-900 text-white px-4 py-2 text-sm font-medium">
            {title}
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={title || 'Video'}
        />
      </div>
    );
  } else {
    // Local video file or direct video URL
    return (
      <VideoPlayer
        src={resolvedSrc}
        poster={resolvedPoster}
        title={title}
        onProgress={onProgress}
        onComplete={onComplete}
        autoPlay={autoPlay}
        startTime={startTime}
      />
    );
  }
};

export default UniversalVideoPlayer;
