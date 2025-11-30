import clsx from 'clsx';

interface SpinnerProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'primary' | 'white' | 'gray' | 'success';
  /** Spinner style */
  type?: 'default' | 'dots' | 'pulse' | 'bars';
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const colorClasses = {
  primary: 'text-primary-600',
  white: 'text-white',
  gray: 'text-gray-400',
  success: 'text-success-600',
};

/**
 * Spinner Component
 * Premium loading spinner with multiple styles
 * 
 * @example
 * <Spinner size="md" variant="primary" />
 * <Spinner type="dots" />
 * <Spinner type="pulse" />
 */
const Spinner = ({
  size = 'md',
  variant = 'primary',
  type = 'default',
  className,
}: SpinnerProps) => {
  if (type === 'dots') {
    return (
      <div className={clsx('loading-dots flex items-center gap-1', colorClasses[variant], className)}>
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={clsx(
        'rounded-full pulse-soft',
        sizeClasses[size],
        variant === 'primary' && 'bg-primary-500',
        variant === 'white' && 'bg-white',
        variant === 'gray' && 'bg-gray-400',
        variant === 'success' && 'bg-success-500',
        className
      )} />
    );
  }

  if (type === 'bars') {
    return (
      <div className={clsx('flex items-end gap-1', colorClasses[variant], className)}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={clsx(
              'w-1 bg-current rounded-full',
              size === 'xs' ? 'h-3' : size === 'sm' ? 'h-4' : size === 'md' ? 'h-6' : size === 'lg' ? 'h-8' : 'h-10'
            )}
            style={{
              animation: `loading-bars 1s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  // Default spinner (SVG)
  return (
    <svg
      className={clsx('spinner-smooth', sizeClasses[size], colorClasses[variant], className)}
      viewBox="0 0 50 50"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-20"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
};

export default Spinner;
