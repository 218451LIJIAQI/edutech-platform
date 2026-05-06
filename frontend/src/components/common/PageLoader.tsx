import { BookOpen } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

const PageLoader = ({ message = 'Loading...' }: PageLoaderProps) => (
  <div
    className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/20 to-indigo-50/30 px-4"
    role="status"
    aria-live="polite"
    aria-label={message}
  >
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-xl shadow-primary-500/25">
          <BookOpen className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-gray-900">{message}</p>
        <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-primary-500" />
        </div>
      </div>
    </div>
    <span className="sr-only">{message}</span>
  </div>
);

export default PageLoader;
