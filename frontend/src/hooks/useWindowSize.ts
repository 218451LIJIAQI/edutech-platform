import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

/**
 * Hook to track window dimensions
 * Updates on window resize with debouncing
 * 
 * @example
 * const { width, height } = useWindowSize();
 * 
 * if (width < 768) {
 *   // Mobile view
 * }
 */
const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Set initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
};

export default useWindowSize;

/**
 * Hook to check if viewport matches mobile breakpoint
 */
export const useIsMobile = (breakpoint: number = 768): boolean => {
  const { width } = useWindowSize();
  return width < breakpoint;
};

/**
 * Hook to check if viewport matches tablet breakpoint
 */
export const useIsTablet = (min: number = 768, max: number = 1024): boolean => {
  const { width } = useWindowSize();
  return width >= min && width < max;
};

/**
 * Hook to check if viewport matches desktop breakpoint
 */
export const useIsDesktop = (breakpoint: number = 1024): boolean => {
  const { width } = useWindowSize();
  return width >= breakpoint;
};
