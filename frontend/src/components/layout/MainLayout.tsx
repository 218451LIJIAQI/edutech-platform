import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollToTop from '../common/ScrollToTop';
import ErrorBoundary from '../common/ErrorBoundary';
import NetworkStatus from '../common/NetworkStatus';
import SkipLink from '../common/SkipLink';

/**
 * Main Layout Component
 * Wraps all pages with navbar, footer, error boundary, scroll-to-top button, and network status
 * Includes accessibility features like skip link for keyboard navigation
 */
const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to main content link for keyboard/screen reader users */}
      <SkipLink targetId="main-content" />
      <NetworkStatus />
      <Navbar />
      <main id="main-content" className="flex-grow" role="main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default MainLayout;

