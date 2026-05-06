import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SCROLL_VISIBILITY_THRESHOLD = 400;

/**
 * Scroll to Top Button Component
 * Shows a floating button after the user scrolls down.
 * Clicking the button scrolls smoothly back to the top of the page.
 */
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_VISIBILITY_THRESHOLD);
    };

    const handleScroll = () => {
      if (animationFrameRef.current !== null) return;

      animationFrameRef.current = window.requestAnimationFrame(() => {
        updateVisibility();
        animationFrameRef.current = null;
      });
    };

    updateVisibility();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 p-3 text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:bottom-8 sm:right-8"
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ArrowUp
        className="h-5 w-5 transition-transform group-hover:-translate-y-0.5"
        aria-hidden="true"
      />
    </button>
  );
};

export default ScrollToTop;