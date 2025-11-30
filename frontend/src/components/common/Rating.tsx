import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

interface RatingProps {
  /** Current rating value (0-5) */
  value?: number;
  /** Callback when rating changes */
  onChange?: (value: number) => void;
  /** Maximum rating value */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether rating is read-only */
  readonly?: boolean;
  /** Show rating value text */
  showValue?: boolean;
  /** Number of reviews (displayed next to value) */
  reviewCount?: number;
  /** Color variant */
  variant?: 'default' | 'primary' | 'warning';
  /** Allow half stars */
  allowHalf?: boolean;
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1',
  xl: 'gap-1.5',
};

const colorClasses = {
  default: {
    filled: 'text-yellow-400',
    empty: 'text-gray-200',
    hover: 'text-yellow-300',
  },
  primary: {
    filled: 'text-primary-500',
    empty: 'text-gray-200',
    hover: 'text-primary-400',
  },
  warning: {
    filled: 'text-warning-500',
    empty: 'text-gray-200',
    hover: 'text-warning-400',
  },
};

/**
 * Rating Component
 * Display and/or collect star ratings
 * 
 * @example
 * // Read-only
 * <Rating value={4.5} readonly showValue reviewCount={128} />
 * 
 * // Interactive
 * <Rating value={rating} onChange={setRating} />
 */
const Rating = ({
  value = 0,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  showValue = false,
  reviewCount,
  variant = 'default',
  allowHalf = true,
  className,
}: RatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (readonly) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (allowHalf && x < halfWidth) {
      setHoverValue(index + 0.5);
    } else {
      setHoverValue(index + 1);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (readonly || !onChange) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (allowHalf && x < halfWidth) {
      onChange(index + 0.5);
    } else {
      onChange(index + 1);
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;
  const colors = colorClasses[variant];

  return (
    <div className={clsx('flex items-center', gapClasses[size], className)}>
      {/* Stars */}
      <div className="flex items-center" onMouseLeave={() => setHoverValue(null)}>
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1;
          const isFilled = displayValue >= starValue;
          const isHalfFilled = !isFilled && displayValue >= starValue - 0.5;

          return (
            <button
              key={index}
              type="button"
              disabled={readonly}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onClick={(e) => handleClick(e, index)}
              className={clsx(
                'relative transition-transform duration-150',
                !readonly && 'cursor-pointer hover:scale-110',
                readonly && 'cursor-default'
              )}
            >
              {/* Empty star (background) */}
              <Star className={clsx(sizeClasses[size], colors.empty, 'fill-current')} />
              
              {/* Filled star (overlay) */}
              {(isFilled || isHalfFilled) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isHalfFilled ? '50%' : '100%' }}
                >
                  <Star className={clsx(
                    sizeClasses[size],
                    hoverValue !== null && !readonly ? colors.hover : colors.filled,
                    'fill-current'
                  )} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Value and reviews */}
      {(showValue || reviewCount !== undefined) && (
        <div className="flex items-center gap-1.5 ml-1">
          {showValue && (
            <span className={clsx(
              'font-semibold text-gray-900',
              size === 'sm' ? 'text-sm' : size === 'xl' ? 'text-lg' : 'text-base'
            )}>
              {value.toFixed(1)}
            </span>
          )}
          {reviewCount !== undefined && (
            <span className={clsx(
              'text-gray-500',
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}>
              ({reviewCount.toLocaleString()})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Rating;
