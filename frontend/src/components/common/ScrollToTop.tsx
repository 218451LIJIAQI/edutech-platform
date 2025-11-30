import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Scroll to Top Button Component
 * Shows a floating button when user scrolls down, clicking it smoothly scrolls to top
 */
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled more than 400px
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 p-3 bg-gradient-to-br from-primary-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-110 transition-all duration-300 animate-fadeInUp group"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};

export default ScrollToTop;
