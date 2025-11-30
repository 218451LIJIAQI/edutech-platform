import { ReactNode } from 'react';
import clsx from 'clsx';
import { CardSkeleton, ListItemSkeleton, StatsSkeleton } from './Skeleton';

interface ContentLoaderProps {
  /** Whether content is loading */
  isLoading: boolean;
  /** Children to render when loaded */
  children: ReactNode;
  /** Skeleton type to show */
  skeleton?: 'card' | 'list' | 'stats' | 'custom';
  /** Number of skeleton items */
  count?: number;
  /** Custom skeleton component */
  customSkeleton?: ReactNode;
  /** Grid columns for card skeletons */
  columns?: 1 | 2 | 3 | 4;
  /** Animation class for loaded content */
  animation?: 'fade' | 'slide' | 'scale' | 'stagger' | 'none';
  /** Additional className */
  className?: string;
}

/**
 * ContentLoader Component
 * Handles loading state with skeleton and smooth content reveal
 * 
 * @example
 * <ContentLoader isLoading={loading} skeleton="card" count={6} columns={3}>
 *   <CourseGrid courses={courses} />
 * </ContentLoader>
 */
const ContentLoader = ({
  isLoading,
  children,
  skeleton = 'card',
  count = 3,
  customSkeleton,
  columns = 3,
  animation = 'stagger',
  className,
}: ContentLoaderProps) => {
  if (isLoading) {
    if (skeleton === 'custom' && customSkeleton) {
      return <>{customSkeleton}</>;
    }

    if (skeleton === 'list') {
      return (
        <div className={clsx('space-y-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-fadeIn">
              <ListItemSkeleton />
            </div>
          ))}
        </div>
      );
    }

    if (skeleton === 'stats') {
      return (
        <div className={clsx(
          'grid gap-6',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-1 sm:grid-cols-2',
          columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
          className
        )}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-fadeIn">
              <StatsSkeleton />
            </div>
          ))}
        </div>
      );
    }

    // Default: card skeleton
    return (
      <div className={clsx(
        'grid gap-6',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-fadeIn">
            <CardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  // Loaded content with animation
  const animationClasses = {
    fade: 'content-reveal',
    slide: 'appear-bottom',
    scale: 'scale-up-smooth',
    stagger: 'content-reveal-stagger',
    none: '',
  };

  return (
    <div className={clsx(animationClasses[animation], className)}>
      {children}
    </div>
  );
};

export default ContentLoader;
