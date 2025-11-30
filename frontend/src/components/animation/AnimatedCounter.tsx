import { useEffect, useState, useRef } from 'react';
import { useInView } from '@/hooks';

interface AnimatedCounterProps {
  /** Target value to count to */
  value: number;
  /** Duration of animation in ms */
  duration?: number;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%", "+") */
  suffix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Trigger animation when entering viewport */
  triggerOnView?: boolean;
  /** Easing function */
  easing?: 'linear' | 'easeOut' | 'easeInOut';
  /** Format number with separators */
  formatNumber?: boolean;
  /** Additional className */
  className?: string;
}

const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * AnimatedCounter Component
 * Animates a number counting up from 0 to target value
 * 
 * @example
 * <AnimatedCounter value={1234} prefix="$" duration={2000} />
 * <AnimatedCounter value={99} suffix="%" triggerOnView />
 * <AnimatedCounter value={50000} suffix="+" formatNumber />
 */
const AnimatedCounter = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  triggerOnView = true,
  easing = 'easeOut',
  formatNumber = true,
  className,
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, enabled: triggerOnView });
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimated = useRef(false);

  useEffect(() => {
    const shouldStart = triggerOnView ? inView : true;
    
    if (!shouldStart || hasAnimated.current) return;
    
    hasAnimated.current = true;
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      
      setDisplayValue(easedProgress * value);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, easing, inView, triggerOnView]);

  const formattedValue = formatNumber
    ? displayValue.toLocaleString('en-US', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals 
      })
    : displayValue.toFixed(decimals);

  return (
    <span ref={triggerOnView ? ref : undefined} className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

export default AnimatedCounter;
