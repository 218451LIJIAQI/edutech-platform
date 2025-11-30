import { ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type TagSize = 'sm' | 'md' | 'lg';

interface TagProps {
  /** Tag content */
  children: ReactNode;
  /** Tag variant */
  variant?: TagVariant;
  /** Tag size */
  size?: TagSize;
  /** Whether tag is outlined */
  outlined?: boolean;
  /** Whether tag is rounded (pill shape) */
  rounded?: boolean;
  /** Icon before content */
  icon?: ReactNode;
  /** Whether tag is removable */
  removable?: boolean;
  /** Callback when tag is removed */
  onRemove?: () => void;
  /** Whether tag is clickable */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

const variantClasses: Record<TagVariant, { solid: string; outlined: string }> = {
  default: {
    solid: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outlined: 'border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  primary: {
    solid: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
    outlined: 'border-primary-300 text-primary-700 hover:bg-primary-50',
  },
  success: {
    solid: 'bg-success-100 text-success-700 hover:bg-success-200',
    outlined: 'border-success-300 text-success-700 hover:bg-success-50',
  },
  warning: {
    solid: 'bg-warning-100 text-warning-700 hover:bg-warning-200',
    outlined: 'border-warning-300 text-warning-700 hover:bg-warning-50',
  },
  danger: {
    solid: 'bg-danger-100 text-danger-700 hover:bg-danger-200',
    outlined: 'border-danger-300 text-danger-700 hover:bg-danger-50',
  },
  info: {
    solid: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
    outlined: 'border-sky-300 text-sky-700 hover:bg-sky-50',
  },
};

const sizeClasses: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-3 py-1 text-sm gap-1.5',
  lg: 'px-4 py-1.5 text-base gap-2',
};

/**
 * Tag Component
 * Display labels, categories, or keywords
 * 
 * @example
 * <Tag variant="primary">React</Tag>
 * <Tag variant="success" icon={<Check />}>Verified</Tag>
 * <Tag removable onRemove={() => {}}>Removable</Tag>
 */
const Tag = ({
  children,
  variant = 'default',
  size = 'md',
  outlined = false,
  rounded = false,
  icon,
  removable = false,
  onRemove,
  clickable = false,
  onClick,
  className,
}: TagProps) => {
  const Component = clickable || onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'inline-flex items-center font-medium transition-colors duration-150',
        rounded ? 'rounded-full' : 'rounded-lg',
        outlined ? 'border bg-transparent' : '',
        outlined ? variantClasses[variant].outlined : variantClasses[variant].solid,
        sizeClasses[size],
        (clickable || onClick) && 'cursor-pointer',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={clsx(
            'flex-shrink-0 ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-current'
          )}
          aria-label="Remove tag"
        >
          <X className={clsx(
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          )} />
        </button>
      )}
    </Component>
  );
};

/**
 * TagGroup - Container for multiple tags
 */
export const TagGroup = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={clsx('flex flex-wrap gap-2', className)}>
    {children}
  </div>
);

export default Tag;
