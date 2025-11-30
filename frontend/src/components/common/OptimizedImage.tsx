import { useState, useRef, useEffect, ImgHTMLAttributes, useMemo } from 'react';
import clsx from 'clsx';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  /** Image source URL */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Placeholder image or color */
  placeholder?: string;
  /** Whether to lazy load the image */
  lazy?: boolean;
  /** Blur placeholder effect */
  blurPlaceholder?: boolean;
  /** Fallback image on error */
  fallbackSrc?: string;
  /** Aspect ratio (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Object fit style */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: () => void;
  /** Container className */
  containerClassName?: string;
  /** Enable WebP format conversion (for supported image services) */
  enableWebP?: boolean;
  /** Image quality (1-100) for optimized images */
  quality?: number;
  /** Responsive image sizes for srcset */
  sizes?: string;
  /** Generate responsive srcset */
  responsive?: boolean;
}

/**
 * OptimizedImage Component
 * Lazy-loaded image with placeholder, error handling, and smooth transitions
 * 
 * @example
 * <OptimizedImage
 *   src="/images/course.jpg"
 *   alt="Course thumbnail"
 *   aspectRatio="16/9"
 *   blurPlaceholder
 * />
 * 
 * @example
 * <OptimizedImage
 *   src={user.avatar}
 *   alt={user.name}
 *   fallbackSrc="/images/default-avatar.png"
 *   className="w-12 h-12 rounded-full"
 * />
 */
// Check if browser supports WebP
const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Generate optimized image URL with WebP and quality params
const getOptimizedUrl = (
  url: string,
  options: { webp?: boolean; quality?: number; width?: number }
): string => {
  if (!url) return url;
  
  // Handle common image CDN/service patterns
  const { webp, quality, width } = options;
  
  // Cloudinary
  if (url.includes('cloudinary.com')) {
    const transforms: string[] = [];
    if (webp) transforms.push('f_webp');
    if (quality) transforms.push(`q_${quality}`);
    if (width) transforms.push(`w_${width}`);
    if (transforms.length > 0) {
      return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
    }
  }
  
  // Imgix
  if (url.includes('imgix.net')) {
    const params = new URLSearchParams();
    if (webp) params.append('fm', 'webp');
    if (quality) params.append('q', String(quality));
    if (width) params.append('w', String(width));
    const separator = url.includes('?') ? '&' : '?';
    return params.toString() ? `${url}${separator}${params.toString()}` : url;
  }
  
  // ImageKit
  if (url.includes('imagekit.io')) {
    const transforms: string[] = [];
    if (webp) transforms.push('f-webp');
    if (quality) transforms.push(`q-${quality}`);
    if (width) transforms.push(`w-${width}`);
    if (transforms.length > 0) {
      return url.replace(/\/tr:([^/]*)\//, `/tr:$1,${transforms.join(',')}/`);
    }
  }
  
  // For local/unknown images, just return as-is
  return url;
};

// Generate srcset for responsive images
const generateSrcSet = (
  url: string,
  options: { webp?: boolean; quality?: number }
): string => {
  const widths = [320, 640, 960, 1280, 1920];
  return widths
    .map((w) => `${getOptimizedUrl(url, { ...options, width: w })} ${w}w`)
    .join(', ');
};

const OptimizedImage = ({
  src,
  alt,
  placeholder,
  lazy = true,
  blurPlaceholder = true,
  fallbackSrc = '/images/placeholder.png',
  aspectRatio,
  objectFit = 'cover',
  onLoad,
  onError,
  className,
  containerClassName,
  enableWebP = true,
  quality = 80,
  sizes = '100vw',
  responsive = false,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Memoize optimized image sources
  const webpSupported = useMemo(() => supportsWebP(), []);
  const useWebP = enableWebP && webpSupported;
  
  const optimizedSrc = useMemo(() => {
    if (hasError) return fallbackSrc;
    return getOptimizedUrl(src, { webp: useWebP, quality });
  }, [src, hasError, fallbackSrc, useWebP, quality]);
  
  const srcSet = useMemo(() => {
    if (!responsive || hasError) return undefined;
    return generateSrcSet(src, { webp: useWebP, quality });
  }, [src, responsive, hasError, useWebP, quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Calculate aspect ratio styles
  const aspectRatioStyle = aspectRatio
    ? { aspectRatio: aspectRatio.replace('/', ' / ') }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative overflow-hidden',
        containerClassName
      )}
      style={aspectRatioStyle}
    >
      {/* Placeholder */}
      {(!isLoaded || !isInView) && (
        <div
          className={clsx(
            'absolute inset-0 bg-gray-200',
            blurPlaceholder && 'animate-pulse'
          )}
          style={placeholder ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' } : undefined}
        />
      )}

      {/* Actual image with WebP and responsive support */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={responsive ? sizes : undefined}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={clsx(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={{
            objectFit,
            width: '100%',
            height: '100%',
          }}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;

/**
 * Avatar image with built-in fallback
 */
export const AvatarImage = ({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'aspectRatio' | 'objectFit'> & { size?: number }) => {
  const [hasError, setHasError] = useState(false);

  // Generate initials from alt text
  const initials = alt
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (hasError || !src) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-white font-semibold rounded-full',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={clsx('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
};
