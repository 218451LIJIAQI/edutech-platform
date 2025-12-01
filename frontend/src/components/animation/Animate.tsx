import { ReactNode, CSSProperties } from 'react';
import clsx from 'clsx';

type AnimationType = 
  | 'fadeIn' | 'fadeInUp' | 'fadeInDown' 
  | 'slideInRight' | 'slideInLeft' | 'slideUpFade'
  | 'scaleIn' | 'zoomIn' | 'popIn' | 'bounceIn' | 'blurIn'
  | 'flipInX' | 'flipInY' | 'rotateIn';

interface AnimateProps {
  children: ReactNode;
  /** Animation type */
  animation?: AnimationType;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Duration of animation (ms) */
  duration?: number;
  /** Custom className */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
}

const animationClasses: Record<AnimationType, string> = {
  fadeIn: 'animate-fadeIn',
  fadeInUp: 'animate-fadeInUp',
  fadeInDown: 'animate-fadeInDown',
  slideInRight: 'animate-slideInRight',
  slideInLeft: 'animate-slideInLeft',
  slideUpFade: 'animate-slideUpFade',
  scaleIn: 'animate-scaleIn',
  zoomIn: 'animate-zoomIn',
  popIn: 'animate-popIn',
  bounceIn: 'animate-bounceIn',
  blurIn: 'animate-blurIn',
  flipInX: 'animate-flipInX',
  flipInY: 'animate-flipInY',
  rotateIn: 'animate-rotateIn',
};

/**
 * Animate Component
 * Wrapper component that applies entrance animations
 * 
 * @example
 * <Animate animation="fadeInUp">
 *   <div>Content</div>
 * </Animate>
 * 
 * <Animate animation="popIn" delay={200}>
 *   <Button>Click me</Button>
 * </Animate>
 */
const Animate = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration,
  className,
  style,
}: AnimateProps) => {
  const animationStyle: CSSProperties = {
    ...style,
    animationDelay: delay ? `${delay}ms` : undefined,
    animationDuration: duration ? `${duration}ms` : undefined,
  };

  return (
    <div
      className={clsx(animationClasses[animation], className)}
      style={animationStyle}
    >
      {children}
    </div>
  );
};

export default Animate;

/**
 * FadeIn Component - Shorthand for fade in animation
 */
export const FadeIn = ({ children, ...props }: Omit<AnimateProps, 'animation'>) => (
  <Animate animation="fadeIn" {...props}>{children}</Animate>
);

/**
 * FadeInUp Component - Shorthand for fade in up animation
 */
export const FadeInUp = ({ children, ...props }: Omit<AnimateProps, 'animation'>) => (
  <Animate animation="fadeInUp" {...props}>{children}</Animate>
);

/**
 * SlideIn Component - Shorthand for slide in animation
 */
export const SlideIn = ({ 
  children, 
  direction = 'right',
  ...props 
}: Omit<AnimateProps, 'animation'> & { direction?: 'left' | 'right' }) => (
  <Animate 
    animation={direction === 'left' ? 'slideInLeft' : 'slideInRight'} 
    {...props}
  >
    {children}
  </Animate>
);

/**
 * PopIn Component - Shorthand for pop in animation
 */
export const PopIn = ({ children, ...props }: Omit<AnimateProps, 'animation'>) => (
  <Animate animation="popIn" {...props}>{children}</Animate>
);

/**
 * ScaleIn Component - Shorthand for scale in animation
 */
export const ScaleIn = ({ children, ...props }: Omit<AnimateProps, 'animation'>) => (
  <Animate animation="scaleIn" {...props}>{children}</Animate>
);
