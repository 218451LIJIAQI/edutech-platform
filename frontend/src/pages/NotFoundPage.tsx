import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-600 rounded-full blur-3xl"></div>
      </div>
      <div className="text-center relative z-10 max-w-2xl mx-auto px-4">
        <div className="mb-12 card shadow-2xl bg-white border border-gray-100 p-12 rounded-3xl inline-block">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 bg-clip-text text-transparent mb-6 drop-shadow-lg">404</h1>
          <div className="text-8xl mb-8 animate-bounce">🔍</div>
        </div>
        <h2 className="text-5xl font-bold text-gray-900 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-12 text-xl max-w-md mx-auto leading-relaxed">The page you're looking for doesn't exist or has been moved to another location.</p>
        <Link to="/" className="btn-primary btn-lg inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <Home className="w-6 h-6" />
          <span className="font-bold">Go Back Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

