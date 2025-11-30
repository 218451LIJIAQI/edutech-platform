import { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  rounded?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-primary-100 text-primary-700 border-primary-200',
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  danger: 'bg-danger-100 text-danger-700 border-danger-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-blue-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

/**
 * Badge Component
 * Displays status, labels, or counts
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  rounded = false,
  className = '',
}: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold border transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        rounded ? 'rounded-full' : 'rounded-lg',
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
