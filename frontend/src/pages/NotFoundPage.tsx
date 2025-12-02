import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Compass, BookOpen } from 'lucide-react';
import { usePageTitle } from '@/hooks';

/**
 * 404 Not Found Page - Premium Design
 */
const NotFoundPage = () => {
  usePageTitle('Page Not Found');
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-20 right-[10%] w-80 h-80 bg-gradient-to-br from-primary-400/15 to-indigo-400/15 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-float delay-200"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-300/5 rounded-full blur-3xl"></div>
      
      <div className="text-center relative z-10 max-w-2xl mx-auto px-4 animate-fadeInUp">
        {/* Error Card */}
        <div className="mb-10 bg-white/90 backdrop-blur-xl shadow-2xl shadow-gray-900/5 border border-gray-100/60 p-12 rounded-3xl inline-block relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative">
            <h1 className="text-8xl md:text-9xl font-extrabold bg-gradient-to-r from-primary-500 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 tracking-tighter" aria-label="404 Error">
              404
            </h1>
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto animate-bounce-soft">
                <Search className="w-10 h-10 text-primary-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning-400 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Oops! Page Not Found
        </h2>
        <p className="text-gray-500 mb-10 text-lg max-w-md mx-auto leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/" 
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30 transition-all duration-300 hover:scale-[1.02]"
            aria-label="Go back to home page"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-700 font-semibold text-lg rounded-2xl shadow-lg border border-gray-200 hover:border-primary-300 hover:text-primary-600 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </button>
        </div>
        
        {/* Helpful Links */}
        <div className="mt-16 pt-10 border-t border-gray-200/60">
          <p className="text-sm text-gray-400 mb-6 font-medium">Maybe these links can help:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/courses" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-600 hover:text-primary-600 rounded-xl font-medium text-sm transition-colors">
              <BookOpen className="w-4 h-4" />
              Browse Courses
            </Link>
            <Link to="/teachers" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-600 hover:text-primary-600 rounded-xl font-medium text-sm transition-colors">
              <Compass className="w-4 h-4" />
              Find Teachers
            </Link>
            <Link to="/help" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-600 hover:text-primary-600 rounded-xl font-medium text-sm transition-colors">
              <Search className="w-4 h-4" />
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
