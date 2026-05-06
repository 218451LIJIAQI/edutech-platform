import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

import clientLogger from '@/utils/logger';

interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  reloadPage: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  resetKeys?: unknown[];
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/30';

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 shadow-lg transition-all duration-300 hover:border-primary-300 hover:text-primary-600';

const areResetKeysChanged = (
  previousKeys: unknown[] = [],
  currentKeys: unknown[] = []
): boolean => {
  if (previousKeys.length !== currentKeys.length) {
    return true;
  }

  return previousKeys.some((key, index) => !Object.is(key, currentKeys[index]));
};

/**
 * ErrorBoundary Component
 * Catches JavaScript errors in the child component tree and displays a safe fallback UI.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    clientLogger.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;

    if (
      this.state.hasError &&
      resetKeys &&
      areResetKeysChanged(previousProps.resetKeys, resetKeys)
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    this.props.onReset?.();
  };

  reloadPage = (): void => {
    window.location.reload();
  };

  renderFallback(): ReactNode {
    const { fallback } = this.props;
    const { error, errorInfo } = this.state;

    if (typeof fallback === 'function') {
      return fallback({
        error,
        errorInfo,
        resetError: this.resetErrorBoundary,
        reloadPage: this.reloadPage,
      });
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="rounded-3xl border border-gray-100/80 bg-white/90 p-8 shadow-2xl shadow-gray-900/5 backdrop-blur-xl">
            {/* Error Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-danger-100 to-danger-50">
              <AlertTriangle
                className="h-10 w-10 text-danger-500"
                aria-hidden="true"
              />
            </div>

            <h2 className="mb-3 text-2xl font-bold text-gray-900">
              Oops! Something went wrong
            </h2>

            <p className="mb-6 text-gray-500">
              We encountered an unexpected error. Please try again, refresh the
              page, or return to the home page.
            </p>

            {/* Error details in development only */}
            {import.meta.env.DEV && error && (
              <details className="mb-6 rounded-xl bg-gray-50 p-4 text-left text-sm">
                <summary className="cursor-pointer font-medium text-gray-600">
                  Error Details (Development Only)
                </summary>

                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-danger-600">
                  {error.name}: {error.message}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={this.resetErrorBoundary}
                className={primaryButtonClassName}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Try Again
              </button>

              <button
                type="button"
                onClick={this.reloadPage}
                className={secondaryButtonClassName}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>

              <Link
                to="/"
                onClick={this.resetErrorBoundary}
                className={secondaryButtonClassName}
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;