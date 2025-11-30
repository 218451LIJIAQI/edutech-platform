import { BookOpen } from 'lucide-react';

interface PageLoaderProps {
  /** Loading message to display */
  message?: string;
  /** Whether to show full page loader or inline */
  fullPage?: boolean;
}

/**
 * PageLoader Component
 * Displays a loading animation for page transitions
 */
const PageLoader = ({ 
  message = 'Loading...', 
  fullPage = true 
}: PageLoaderProps) => {
  const content = (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};

export default PageLoader;
