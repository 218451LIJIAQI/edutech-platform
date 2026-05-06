import { CSSProperties, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  animation?: 'pulse' | 'none';
}

/**
 * Skeleton Loading Component
 * Displays a visual placeholder while content is loading.
 */
const Skeleton = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) => {
  const baseClasses = 'bg-gray-200/80';

  const animationClasses = {
    pulse: 'animate-pulse motion-reduce:animate-none',
    none: '',
  };

  const variantClasses = {
    text: 'h-4 rounded-lg',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-xl',
  };

  return (
    <div
      {...props}
      role="presentation"
      aria-hidden="true"
      className={clsx(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
    />
  );
};

export default Skeleton;

/**
 * Text Block Skeleton
 * For loading paragraph-like text content.
 */
export const SkeletonTextBlock = ({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={clsx('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        className={clsx('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')}
      />
    ))}
  </div>
);

/**
 * Card Skeleton
 * For course or content cards.
 */
export const CardSkeleton = () => (
  <div
    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
    aria-hidden="true"
  >
    <Skeleton variant="rectangular" className="aspect-video w-full" />

    <div className="space-y-4 p-5">
      <Skeleton variant="text" className="h-6 w-3/4" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-2/3" />

      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" className="h-6 w-20" />
        <Skeleton variant="rounded" className="h-6 w-16" />
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-6 w-16" />
      </div>
    </div>
  </div>
);

/**
 * Stats Skeleton
 * For dashboard statistic cards.
 */
export const StatsSkeleton = () => (
  <div
    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
    aria-hidden="true"
  >
    <div className="mb-4 flex items-center justify-between">
      <Skeleton variant="circular" width={48} height={48} />
      <Skeleton variant="text" className="h-4 w-16" />
    </div>

    <Skeleton variant="text" className="mb-2 h-8 w-24" />
    <Skeleton variant="text" className="h-4 w-32" />
  </div>
);