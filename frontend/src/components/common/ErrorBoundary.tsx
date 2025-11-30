import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    // TODO: Send error to logging service in production
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/5 p-8 border border-gray-100/80">
              {/* Error Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-danger-100 to-danger-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-danger-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-500 mb-6">
                We encountered an unexpected error. Please try refreshing the page or go back to home.
              </p>

              {/* Error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left mb-6 p-4 bg-gray-50 rounded-xl text-sm">
                  <summary className="cursor-pointer text-gray-600 font-medium mb-2">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="text-xs text-danger-600 overflow-auto max-h-40 mt-2">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                <Link
                  to="/"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl shadow-lg border border-gray-200 hover:border-primary-300 hover:text-primary-600 transition-all duration-300"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
