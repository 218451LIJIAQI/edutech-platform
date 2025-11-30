import { ReactNode, Children, cloneElement, isValidElement, CSSProperties } from 'react';
import clsx from 'clsx';
import { useInView } from '@/hooks';

interface StaggeredListProps {
  children: ReactNode;
  /** Delay between each item (ms) */
  staggerDelay?: number;
  /** Initial delay before first item (ms) */
  initialDelay?: number;
  /** Animation duration for each item (ms) */
  duration?: number;
  /** Trigger animation when entering viewport */
  triggerOnView?: boolean;
  /** Additional className for container */
  className?: string;
}

/**
 * StaggeredList Component
 * Animates children with staggered delays
 * 
 * @example
 * <StaggeredList staggerDelay={100} triggerOnView>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </StaggeredList>
 */
const StaggeredList = ({
  children,
  staggerDelay = 75,
  initialDelay = 0,
  duration = 500,
  triggerOnView = false,
  className,
}: StaggeredListProps) => {
  const { ref, inView } = useInView({ triggerOnce: true, enabled: triggerOnView });
  const shouldAnimate = triggerOnView ? inView : true;

  const childArray = Children.toArray(children);

  return (
    <div ref={triggerOnView ? (ref as React.RefObject<HTMLDivElement>) : undefined} className={className}>
      {childArray.map((child, index) => {
        if (!isValidElement(child)) return child;

        const delay = initialDelay + index * staggerDelay;
        const childStyle: CSSProperties = {
          ...(child.props.style || {}),
          opacity: shouldAnimate ? undefined : 0,
          animationDelay: `${delay}ms`,
          animationDuration: `${duration}ms`,
          animationFillMode: 'forwards',
        };

        return cloneElement(child, {
          key: child.key || index,
          className: clsx(
            child.props.className,
            shouldAnimate && 'animate-slideUpFade'
          ),
          style: childStyle,
        } as Record<string, unknown>);
      })}
    </div>
  );
};

export default StaggeredList;
