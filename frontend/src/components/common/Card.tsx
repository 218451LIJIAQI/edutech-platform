import { ReactNode, forwardRef, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'elevated' | 'flat' | 'glass' | 'gradient' | 'bordered' | 'interactive';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether the card is clickable/hoverable */
  hoverable?: boolean;
  /** Additional className */
  className?: string;
  children: ReactNode;
}

interface CardHeaderProps {
  children: ReactNode;
  /** Action buttons to display on the right */
  action?: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: ReactNode;
  /** Subtitle text */
  subtitle?: string;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  /** Alignment of footer content */
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

interface CardImageProps {
  src: string;
  alt: string;
  /** Aspect ratio */
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
  /** Position: top or bottom */
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Card Component
 * Versatile card container with multiple variants
 * 
 * @example
 * <Card variant="elevated" hoverable>
 *   <CardImage src="/image.jpg" alt="..." aspectRatio="video" />
 *   <CardHeader>
 *     <CardTitle subtitle="Subtitle">Card Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Card content goes here
 *   </CardContent>
 *   <CardFooter align="right">
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-white/95 backdrop-blur-md border border-gray-100/60 shadow-card',
      elevated: 'bg-white shadow-elegant-lg border-0',
      flat: 'bg-gray-50/80 border border-gray-100/60',
      glass: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-elegant-lg',
      gradient: 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white border-0 shadow-premium',
      bordered: 'bg-white border-2 border-gray-200 shadow-none',
      interactive: 'bg-white/95 backdrop-blur-md border border-gray-100/60 shadow-card cursor-pointer',
    };

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl transition-all duration-300 ease-out',
          variantClasses[variant],
          padding !== 'none' && paddingClasses[padding],
          (hoverable || variant === 'interactive') && [
            'hover:shadow-card-hover hover:-translate-y-1',
            variant === 'bordered' && 'hover:border-primary-300',
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - Top section with optional action
 */
export const CardHeader = ({ children, action, className }: CardHeaderProps) => (
  <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
    <div className="flex-1">{children}</div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

/**
 * CardTitle - Title with optional subtitle
 */
export const CardTitle = ({ children, subtitle, className }: CardTitleProps) => (
  <div className={className}>
    <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

/**
 * CardContent - Main content area
 */
export const CardContent = ({ children, className }: CardContentProps) => (
  <div className={clsx('text-gray-600', className)}>{children}</div>
);

/**
 * CardFooter - Bottom section
 */
export const CardFooter = ({ children, align = 'right', className }: CardFooterProps) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 mt-6 pt-4 border-t border-gray-100',
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * CardImage - Image section
 */
export const CardImage = ({
  src,
  alt,
  aspectRatio = 'video',
  position = 'top',
  className,
}: CardImageProps) => {
  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  return (
    <div
      className={clsx(
        'overflow-hidden -mx-6',
        position === 'top' ? '-mt-6 mb-4 rounded-t-2xl' : '-mb-6 mt-4 rounded-b-2xl',
        aspectClasses[aspectRatio],
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
};

export default Card;
