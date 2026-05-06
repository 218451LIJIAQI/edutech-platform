import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollToTop from '../common/ScrollToTop';
import ErrorBoundary from '../common/ErrorBoundary';
import NetworkStatus from '../common/NetworkStatus';
import SkipLink from '../common/SkipLink';
import LoginPromotionModal from '../common/LoginPromotionModal';

/**
 * MainLayout
 *
 * Provides the shared page structure for the application.
 * It includes the navbar, footer, route content area, accessibility skip link,
 * network status indicator, scroll-to-top button, and login promotion modal.
 */
const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 antialiased">
      <SkipLink targetId="main-content" />

      <NetworkStatus />
      <Navbar />

      <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
      <ScrollToTop />
      <LoginPromotionModal />
    </div>
  );
};

export default MainLayout;