import clsx from 'clsx';

interface ProgressProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'inside' | 'outside' | 'top';
  /** Custom label format */
  formatLabel?: (value: number, max: number) => string;
  /** Animated stripes */
  animated?: boolean;
  /** Striped pattern */
  striped?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Progress Component
 * Progress bar with various styles
 * 
 * @example
 * // Basic progress
 * <Progress value={75} />
 * 
 * // With label
 * <Progress value={50} showLabel labelPosition="top" />
 * 
 * // Animated striped
 * <Progress value={65} striped animated color="success" />
 */
const Progress = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  labelPosition = 'outside',
  formatLabel,
  animated = false,
  striped = false,
  className,
}: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const label = formatLabel 
    ? formatLabel(value, max) 
    : `${Math.round(percentage)}%`;

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
    success: 'bg-gradient-to-r from-success-500 to-success-600',
    warning: 'bg-gradient-to-r from-warning-500 to-warning-600',
    danger: 'bg-gradient-to-r from-danger-500 to-danger-600',
    info: 'bg-gradient-to-r from-sky-500 to-sky-600',
  };

  const stripedClass = striped
    ? 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]'
    : '';

  const animatedClass = animated && striped ? 'animate-[progress-stripes_1s_linear_infinite]' : '';

  return (
    <div className={clsx('w-full', className)}>
      {/* Top label */}
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-gray-900">{label}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Progress bar container */}
        <div
          className={clsx(
            'flex-1 bg-gray-100 rounded-full overflow-hidden',
            sizeClasses[size]
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {/* Progress bar fill */}
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500 ease-out',
              colorClasses[color],
              stripedClass,
              animatedClass,
              // Inside label styling
              showLabel && labelPosition === 'inside' && size === 'lg' && 'flex items-center justify-center'
            )}
            style={{ width: `${percentage}%` }}
          >
            {showLabel && labelPosition === 'inside' && size === 'lg' && percentage > 10 && (
              <span className="text-xs font-semibold text-white px-2">{label}</span>
            )}
          </div>
        </div>

        {/* Outside label */}
        {showLabel && labelPosition === 'outside' && (
          <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * CircularProgress Component
 * Circular progress indicator
 */
export const CircularProgress = ({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  color = 'primary',
  showLabel = true,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: ProgressProps['color'];
  showLabel?: boolean;
  className?: string;
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
    info: 'text-sky-600',
  };

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(colorClasses[color], 'transition-all duration-500 ease-out')}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-bold text-gray-900">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

export default Progress;
