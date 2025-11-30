import { ReactNode } from 'react';
import clsx from 'clsx';

interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * SkipLink Component
 * Provides keyboard users a way to skip navigation and go directly to main content
 * Essential for accessibility compliance
 * 
 * @example
 * // In your layout component:
 * <SkipLink targetId="main-content" />
 * <Header />
 * <main id="main-content">
 *   ...
 * </main>
 */
const SkipLink = ({
  targetId,
  children = 'Skip to main content',
  className,
}: SkipLinkProps) => {
  return (
    <a
      href={`#${targetId}`}
      className={clsx(
        // Hidden by default
        'absolute -top-full left-4 z-[9999]',
        // Visible when focused
        'focus:top-4',
        // Styling
        'px-4 py-2 bg-primary-600 text-white font-medium rounded-lg',
        'shadow-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
};

export default SkipLink;
