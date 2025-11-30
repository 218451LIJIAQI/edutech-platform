import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

interface PageTransitionProps {
  children: ReactNode;
  /** Animation type */
  animation?: 'fade' | 'slide' | 'scale' | 'blur';
  /** Animation duration in ms */
  duration?: number;
  /** Additional className */
  className?: string;
}

/**
 * PageTransition Component
 * Smooth page transition animations on route change
 * 
 * @example
 * <PageTransition animation="fade">
 *   <YourPage />
 * </PageTransition>
 */
const PageTransition = ({
  children,
  animation = 'fade',
  duration = 400,
  className,
}: PageTransitionProps) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Start exit animation
    setIsVisible(false);
    
    // After exit, update content and show
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, duration / 3);

    return () => clearTimeout(timer);
  }, [location.pathname, children, duration]);

  // Initial mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const animationClasses = {
    fade: isVisible ? 'opacity-100' : 'opacity-0',
    slide: isVisible 
      ? 'opacity-100 translate-y-0' 
      : 'opacity-0 translate-y-4',
    scale: isVisible 
      ? 'opacity-100 scale-100' 
      : 'opacity-0 scale-[0.98]',
    blur: isVisible 
      ? 'opacity-100 blur-0' 
      : 'opacity-0 blur-sm',
  };

  return (
    <div
      className={clsx(
        'transition-all ease-out',
        animationClasses[animation],
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
