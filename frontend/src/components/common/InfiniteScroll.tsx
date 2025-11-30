import { ReactNode, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';

interface InfiniteScrollProps {
  /** Children to render */
  children: ReactNode;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Whether currently loading */
  isLoading?: boolean;
  /** Custom loader component */
  loader?: ReactNode;
  /** End message when no more items */
  endMessage?: ReactNode;
  /** Threshold in pixels before triggering load */
  threshold?: number;
  /** Container className */
  className?: string;
  /** Whether to use window scroll or container scroll */
  useWindow?: boolean;
}

/**
 * InfiniteScroll Component
 * Loads more content when user scrolls near the bottom
 * 
 * @example
 * <InfiniteScroll
 *   hasMore={hasNextPage}
 *   onLoadMore={fetchNextPage}
 *   isLoading={isFetching}
 *   endMessage={<p>No more courses to show</p>}
 * >
 *   {courses.map(course => <CourseCard key={course.id} course={course} />)}
 * </InfiniteScroll>
 */
const InfiniteScroll = ({
  children,
  hasMore,
  onLoadMore,
  isLoading = false,
  loader,
  endMessage,
  threshold = 200,
  className,
  useWindow = true,
}: InfiniteScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: useWindow ? null : containerRef.current,
      rootMargin: `${threshold}px`,
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, useWindow]);

  const defaultLoader = (
    <div className="flex justify-center py-6">
      <Spinner size="md" />
    </div>
  );

  const defaultEndMessage = (
    <div className="text-center py-6 text-gray-500">
      <p>You've reached the end</p>
    </div>
  );

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {children}

      {/* Load more trigger element */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Loading indicator */}
      {isLoading && (loader || defaultLoader)}

      {/* End message */}
      {!hasMore && !isLoading && (endMessage || defaultEndMessage)}
    </div>
  );
};

export default InfiniteScroll;
