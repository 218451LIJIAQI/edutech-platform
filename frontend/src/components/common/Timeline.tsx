import { ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';

interface TimelineItem {
  /** Unique identifier */
  id: string | number;
  /** Title of the timeline item */
  title: string;
  /** Description or content */
  description?: string;
  /** Timestamp or date string */
  date?: string;
  /** Status of the item */
  status?: 'completed' | 'current' | 'pending';
  /** Custom icon */
  icon?: ReactNode;
  /** Additional content */
  content?: ReactNode;
}

interface TimelineProps {
  /** Timeline items */
  items: TimelineItem[];
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'primary' | 'success';
  /** Whether to animate on scroll */
  animated?: boolean;
  /** Additional className */
  className?: string;
}

const statusColors = {
  completed: {
    default: 'bg-gray-600 border-gray-600',
    primary: 'bg-primary-600 border-primary-600',
    success: 'bg-success-600 border-success-600',
  },
  current: {
    default: 'bg-white border-gray-400 ring-4 ring-gray-100',
    primary: 'bg-white border-primary-500 ring-4 ring-primary-100',
    success: 'bg-white border-success-500 ring-4 ring-success-100',
  },
  pending: {
    default: 'bg-gray-100 border-gray-200',
    primary: 'bg-gray-100 border-gray-200',
    success: 'bg-gray-100 border-gray-200',
  },
};

const lineColors = {
  default: 'bg-gray-200',
  primary: 'bg-primary-200',
  success: 'bg-success-200',
};

/**
 * Timeline Component
 * Display a sequence of events in chronological order
 * 
 * @example
 * <Timeline
 *   items={[
 *     { id: 1, title: 'Order Placed', date: 'Jan 1', status: 'completed' },
 *     { id: 2, title: 'Processing', date: 'Jan 2', status: 'current' },
 *     { id: 3, title: 'Shipped', date: 'Jan 3', status: 'pending' },
 *   ]}
 *   variant="primary"
 * />
 */
const Timeline = ({
  items,
  direction = 'vertical',
  size = 'md',
  variant = 'default',
  animated = true,
  className,
}: TimelineProps) => {
  const sizeClasses = {
    sm: { dot: 'w-6 h-6', icon: 'w-3 h-3', text: 'text-sm' },
    md: { dot: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-base' },
    lg: { dot: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-lg' },
  };

  if (direction === 'horizontal') {
    return (
      <div className={clsx('flex items-start', className)}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={clsx(
              'flex-1 flex flex-col items-center text-center',
              animated && 'animate-fadeIn',
              animated && `delay-${Math.min(index * 100, 500)}`
            )}
          >
            {/* Top content */}
            <div className="mb-4">
              <h4 className={clsx('font-semibold text-gray-900', sizeClasses[size].text)}>
                {item.title}
              </h4>
              {item.date && (
                <p className="text-xs text-gray-500 mt-1">{item.date}</p>
              )}
            </div>

            {/* Dot and line */}
            <div className="relative flex items-center w-full">
              {/* Left line */}
              {index > 0 && (
                <div className={clsx('flex-1 h-0.5', lineColors[variant])} />
              )}
              
              {/* Dot */}
              <div
                className={clsx(
                  'flex-shrink-0 rounded-full border-2 flex items-center justify-center',
                  sizeClasses[size].dot,
                  statusColors[item.status || 'pending'][variant]
                )}
              >
                {item.icon || (item.status === 'completed' ? (
                  <Check className={clsx(sizeClasses[size].icon, 'text-white')} />
                ) : item.status === 'current' ? (
                  <Circle className={clsx(sizeClasses[size].icon, `text-${variant === 'default' ? 'gray' : variant}-500 fill-current`)} />
                ) : null)}
              </div>

              {/* Right line */}
              {index < items.length - 1 && (
                <div className={clsx('flex-1 h-0.5', lineColors[variant])} />
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-500 mt-4 max-w-[200px]">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Vertical layout
  return (
    <div className={clsx('relative', className)}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={clsx(
            'relative flex gap-4 pb-8 last:pb-0',
            animated && 'animate-slideUpFade',
            animated && { 'delay-100': index === 1, 'delay-200': index === 2, 'delay-300': index >= 3 }
          )}
        >
          {/* Timeline line and dot */}
          <div className="flex flex-col items-center">
            {/* Dot */}
            <div
              className={clsx(
                'flex-shrink-0 rounded-full border-2 flex items-center justify-center z-10',
                sizeClasses[size].dot,
                statusColors[item.status || 'pending'][variant]
              )}
            >
              {item.icon || (item.status === 'completed' ? (
                <Check className={clsx(sizeClasses[size].icon, 'text-white')} />
              ) : item.status === 'current' ? (
                <Circle className={clsx(sizeClasses[size].icon, 'text-primary-500 fill-current')} />
              ) : null)}
            </div>

            {/* Line */}
            {index < items.length - 1 && (
              <div className={clsx('w-0.5 flex-1 mt-2', lineColors[variant])} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-3 mb-1">
              <h4 className={clsx('font-semibold text-gray-900', sizeClasses[size].text)}>
                {item.title}
              </h4>
              {item.date && (
                <span className="text-xs text-gray-400">{item.date}</span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-500">{item.description}</p>
            )}
            {item.content && (
              <div className="mt-3">{item.content}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
