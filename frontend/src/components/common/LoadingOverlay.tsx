import { ReactNode } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';

interface LoadingOverlayProps {
  /** Whether loading is active */
  isLoading: boolean;
  /** Loading text */
  text?: string;
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to blur the background */
  blur?: boolean;
  /** Whether overlay is fullscreen */
  fullscreen?: boolean;
  /** Children to render behind overlay */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * LoadingOverlay Component
 * Overlay with loading indicator
 * 
 * @example
 * <LoadingOverlay isLoading={loading} text="Loading...">
 *   <ContentToShow />
 * </LoadingOverlay>
 */
const LoadingOverlay = ({
  isLoading,
  text,
  size = 'md',
  blur = true,
  fullscreen = false,
  children,
  className,
}: LoadingOverlayProps) => {
  if (!isLoading && children) {
    return <div className={clsx('content-reveal', className)}>{children}</div>;
  }

  const overlay = (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4',
        fullscreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10',
        blur ? 'bg-white/80 backdrop-blur-sm' : 'bg-white/90',
        'animate-fadeIn'
      )}
    >
      <Spinner size={size} variant="primary" />
      {text && (
        <p className="text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );

  if (children) {
    return (
      <div className={clsx('relative', className)}>
        <div className={clsx(isLoading && blur && 'blur-sm transition-all duration-300')}>
          {children}
        </div>
        {isLoading && overlay}
      </div>
    );
  }

  return overlay;
};

export default LoadingOverlay;
