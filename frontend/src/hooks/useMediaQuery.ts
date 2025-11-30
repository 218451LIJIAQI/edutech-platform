import { useState, useEffect } from 'react';

/**
 * useMediaQuery Hook
 * Detects if a media query matches the current viewport
 * Useful for responsive designs and conditional rendering
 * 
 * @param query - CSS media query string
 * @returns Boolean indicating if the media query matches
 * 
 * @example
 * // Check if viewport is mobile
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * 
 * // Check if user prefers dark mode
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * 
 * // Check if user prefers reduced motion
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */
function useMediaQuery(query: string): boolean {
  // Initialize with the current match state (SSR safe)
  const getMatches = (query: string): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    
    // Update state when media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers (Safari < 14)
      mediaQueryList.addListener(handleChange);
      return () => mediaQueryList.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

// Preset breakpoints matching Tailwind CSS
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * useBreakpoint Hook
 * Convenient wrapper for common Tailwind breakpoints
 * 
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 */
export function useBreakpoint() {
  const sm = useMediaQuery(breakpoints.sm);
  const md = useMediaQuery(breakpoints.md);
  const lg = useMediaQuery(breakpoints.lg);
  const xl = useMediaQuery(breakpoints.xl);
  const xxl = useMediaQuery(breakpoints['2xl']);

  return {
    isMobile: !sm,
    isTablet: sm && !lg,
    isDesktop: lg,
    sm,
    md,
    lg,
    xl,
    '2xl': xxl,
  };
}

export default useMediaQuery;
