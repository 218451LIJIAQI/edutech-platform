import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallback?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
}

/**
 * LazyImage Component
 * Lazy loads images with intersection observer, shows placeholder while loading
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  fallback = '/placeholder-image.png',
  aspectRatio = 'auto',
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const aspectRatioClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={imgRef}
      className={clsx(
        'relative overflow-hidden bg-gray-200',
        aspectRatioClasses[aspectRatio],
        placeholderClassName
      )}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          src={hasError ? fallback : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={clsx(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}
    </div>
  );
};

export default LazyImage;
