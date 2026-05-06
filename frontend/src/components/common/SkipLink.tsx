import { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';

interface SkipLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  children?: ReactNode;
}

/**
 * SkipLink Component
 * Provides keyboard users with a quick way to skip repeated navigation
 * and move directly to the main content area.
 *
 * @example
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
  onClick,
  ...props
}: SkipLinkProps) => {
  const normalizedTargetId = targetId.replace(/^#/, '');

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) return;

    const targetElement = document.getElementById(normalizedTargetId);

    if (!targetElement) return;

    event.preventDefault();

    const hadTabIndex = targetElement.hasAttribute('tabindex');
    const previousTabIndex = targetElement.getAttribute('tabindex');

    if (!hadTabIndex) {
      targetElement.setAttribute('tabindex', '-1');
    }

    targetElement.scrollIntoView({ block: 'start' });
    targetElement.focus({ preventScroll: true });

    targetElement.addEventListener(
      'blur',
      () => {
        if (hadTabIndex && previousTabIndex !== null) {
          targetElement.setAttribute('tabindex', previousTabIndex);
        } else {
          targetElement.removeAttribute('tabindex');
        }
      },
      { once: true }
    );
  };

  return (
    <a
      {...props}
      href={`#${normalizedTargetId}`}
      onClick={handleClick}
      className={clsx(
        'fixed left-4 top-4 z-[9999]',
        '-translate-y-24 opacity-0',
        'rounded-lg bg-primary-600 px-4 py-2 font-medium text-white shadow-lg',
        'transition-all duration-200 motion-reduce:transition-none',
        'focus:translate-y-0 focus:opacity-100',
        'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
};

export default SkipLink;