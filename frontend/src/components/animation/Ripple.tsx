import { useState, useCallback, MouseEvent, ReactNode, CSSProperties } from 'react';
import clsx from 'clsx';

interface RippleEffect {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleProps {
  children: ReactNode;
  /** Color of the ripple */
  color?: string;
  /** Duration of ripple animation (ms) */
  duration?: number;
  /** Whether ripple effect is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/**
 * Ripple Component
 * Adds Material Design ripple effect on click
 * 
 * @example
 * <Ripple>
 *   <button className="btn-primary">Click me</button>
 * </Ripple>
 * 
 * <Ripple color="rgba(255,255,255,0.3)">
 *   <div className="p-4 bg-primary-600 text-white rounded-xl">
 *     Clickable card
 *   </div>
 * </Ripple>
 */
const Ripple = ({
  children,
  color = 'rgba(255, 255, 255, 0.35)',
  duration = 600,
  disabled = false,
  className,
  onClick,
}: RippleProps) => {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple: RippleEffect = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, duration);

    onClick?.(e);
  }, [disabled, duration, onClick]);

  return (
    <div
      className={clsx('relative overflow-hidden', className)}
      onClick={handleClick}
      style={{ isolation: 'isolate' }}
    >
      {children}
      
      {/* Ripple effects */}
      {ripples.map((ripple) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: ripple.x,
          top: ripple.y,
          width: ripple.size,
          height: ripple.size,
          backgroundColor: color,
          borderRadius: '50%',
          transform: 'scale(0)',
          animation: `ripple ${duration}ms linear`,
          pointerEvents: 'none',
        };

        return <span key={ripple.id} style={style} />;
      })}
    </div>
  );
};

export default Ripple;
