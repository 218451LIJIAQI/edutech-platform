import { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'none';
}

/**
 * Skeleton Loading Component
 * Displays a placeholder animation while content is loading
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
    pulse: 'animate-pulse',
    none: '',
  };

  const variantClasses = {
    text: 'rounded-lg h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={clsx(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * Card Skeleton - For course/content cards
 */
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <Skeleton variant="rectangular" className="aspect-video" />
    <div className="p-5 space-y-4">
      <Skeleton variant="text" className="h-6 w-3/4" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" className="h-6 w-20" />
        <Skeleton variant="rounded" className="h-6 w-16" />
      </div>
      <div className="flex justify-between items-center pt-4 border-t">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-6 w-16" />
      </div>
    </div>
  </div>
);

/**
 * List Item Skeleton - For list items
 */
export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
    <Skeleton variant="circular" width={48} height={48} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" className="h-5 w-1/3" />
      <Skeleton variant="text" className="h-4 w-2/3" />
    </div>
    <Skeleton variant="rounded" className="h-8 w-20" />
  </div>
);

/**
 * Table Row Skeleton - For table rows
 */
export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton variant="text" className="h-4" />
      </td>
    ))}
  </tr>
);

/**
 * Profile Skeleton - For user profile cards
 */
export const ProfileSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <div className="flex items-center gap-4 mb-6">
      <Skeleton variant="circular" width={80} height={80} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="h-6 w-1/2" />
        <Skeleton variant="text" className="h-4 w-1/3" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-2/3" />
    </div>
  </div>
);

/**
 * Stats Skeleton - For dashboard stats
 */
export const StatsSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <Skeleton variant="text" className="h-4 w-16" />
    </div>
    <Skeleton variant="text" className="h-8 w-24 mb-2" />
    <Skeleton variant="text" className="h-4 w-32" />
  </div>
);

export default Skeleton;
