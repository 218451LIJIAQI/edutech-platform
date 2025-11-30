import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  /** Stat title/label */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Trend information */
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  /** Icon to display */
  icon?: ReactNode;
  /** Icon background color */
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  /** Card variant */
  variant?: 'default' | 'gradient' | 'outlined';
  /** Whether to show loading state */
  loading?: boolean;
  /** Additional className */
  className?: string;
}

const iconColorClasses = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger: 'bg-danger-100 text-danger-600',
  info: 'bg-sky-100 text-sky-600',
  neutral: 'bg-gray-100 text-gray-600',
};

/**
 * StatsCard Component
 * Display statistics with trend indicators
 * 
 * @example
 * <StatsCard
 *   title="Total Revenue"
 *   value="$12,450"
 *   subtitle="This month"
 *   trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
 *   icon={<DollarSign className="w-6 h-6" />}
 *   iconColor="success"
 * />
 */
const StatsCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor = 'primary',
  variant = 'default',
  loading = false,
  className,
}: StatsCardProps) => {
  const variantClasses = {
    default: 'bg-white border border-gray-100 shadow-card',
    gradient: 'bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0',
    outlined: 'bg-transparent border-2 border-gray-200',
  };

  const isGradient = variant === 'gradient';

  const trendDirection = trend?.direction || 
    (trend?.value && trend.value > 0 ? 'up' : trend?.value && trend.value < 0 ? 'down' : 'neutral');

  const TrendIcon = trendDirection === 'up' ? TrendingUp : 
                    trendDirection === 'down' ? TrendingDown : Minus;

  const trendColorClass = isGradient
    ? 'text-white/90'
    : trendDirection === 'up'
      ? 'text-success-600'
      : trendDirection === 'down'
        ? 'text-danger-600'
        : 'text-gray-500';

  return (
    <div
      className={clsx(
        'relative p-6 rounded-2xl overflow-hidden transition-all duration-300',
        'hover:shadow-card-hover',
        variantClasses[variant],
        className
      )}
    >
      {/* Background decoration */}
      {!isGradient && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      )}

      <div className="relative">
        {/* Header: Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={clsx(
              'text-sm font-medium',
              isGradient ? 'text-white/80' : 'text-gray-500'
            )}>
              {title}
            </p>
            {subtitle && (
              <p className={clsx(
                'text-xs mt-0.5',
                isGradient ? 'text-white/60' : 'text-gray-400'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          
          {icon && (
            <div className={clsx(
              'p-3 rounded-xl',
              isGradient ? 'bg-white/20' : iconColorClasses[iconColor]
            )}>
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        {loading ? (
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        ) : (
          <div className={clsx(
            'text-3xl font-bold tracking-tight',
            isGradient ? 'text-white' : 'text-gray-900'
          )}>
            {value}
          </div>
        )}

        {/* Trend */}
        {trend && !loading && (
          <div className={clsx('flex items-center gap-1.5 mt-3', trendColorClass)}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {trend.value > 0 && '+'}{trend.value}%
            </span>
            {trend.label && (
              <span className={clsx(
                'text-xs',
                isGradient ? 'text-white/60' : 'text-gray-400'
              )}>
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * StatsGrid Component
 * Grid container for stats cards
 */
export const StatsGrid = ({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={clsx('grid gap-6', colClasses[columns], className)}>
      {children}
    </div>
  );
};

export default StatsCard;
