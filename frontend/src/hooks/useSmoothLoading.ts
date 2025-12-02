import { useState, useEffect, useRef } from 'react';

/**
 * Smooth Loading Hook
 * 
 * Provides smooth loading state transitions:
 * - Shows skeleton screen during loading (with soft breathing effect)
 * - Content fades in slowly after loading (500ms)
 * - Avoids flickering, maintains visual continuity
 */
export function useSmoothLoading(isLoading: boolean, delay = 0) {
  const [showContent, setShowContent] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      // Loading complete, start fade-in transition
      hasLoadedOnce.current = true;
      
      // First set showContent so element renders but is transparent
      setShowContent(true);
      
      // Then delay one frame before starting fade-in animation
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay + 50); // 50ms ensures DOM has rendered

      return () => clearTimeout(timer);
    } else {
      // If reloading, smoothly fade out
      if (hasLoadedOnce.current) {
        setIsVisible(false);
        const timer = setTimeout(() => {
          setShowContent(false);
        }, 300); // Wait for fade-out to complete
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, delay]);

  return {
    showSkeleton: isLoading || !showContent,
    showContent,
    isVisible,
    // CSS class name helper
    contentClass: `transition-opacity duration-500 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`,
  };
}

export default useSmoothLoading;
