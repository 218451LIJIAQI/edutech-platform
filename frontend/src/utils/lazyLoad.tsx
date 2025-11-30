import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { PageLoader } from '@/components/common';

/**
 * Creates a lazy-loaded component with loading fallback
 * Use this to code-split pages and heavy components
 * 
 * @param importFn - Dynamic import function
 * @param fallback - Custom loading component (optional)
 * 
 * @example
 * const HomePage = lazyLoad(() => import('./pages/HomePage'));
 * 
 * @example
 * // With custom fallback
 * const DashboardPage = lazyLoad(
 *   () => import('./pages/DashboardPage'),
 *   <CustomLoader />
 * );
 */
export function lazyLoad<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <PageLoader />
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn);

  // Return the lazy component with the fallback stored for reference
  return Object.assign(LazyComponent, {
    fallback,
  }) as LazyExoticComponent<T>;
}

/**
 * Creates a lazy-loaded component with retry capability
 * Useful for handling network failures during chunk loading
 * 
 * @param importFn - Dynamic import function
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Delay between retries in ms (default: 1000)
 */
export function lazyLoadWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries: number = 3,
  delay: number = 1000
): LazyExoticComponent<T> {
  return lazy(() => retryImport(importFn, retries, delay));
}

/**
 * Retry dynamic import with exponential backoff
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return retryImport(importFn, retries - 1, delay * 2);
  }
}

/**
 * Preload a lazy component
 * Call this when you anticipate the user will navigate to a page
 * 
 * @example
 * // Preload on hover
 * <Link 
 *   to="/dashboard" 
 *   onMouseEnter={() => preloadComponent(DashboardPage)}
 * >
 *   Dashboard
 * </Link>
 */
export function preloadComponent<T extends ComponentType<unknown>>(
  lazyComponent: LazyExoticComponent<T>
): void {
  // Access the _payload to trigger preload
  const component = lazyComponent as unknown as { _payload?: { _result?: unknown } };
  if (component._payload && !component._payload._result) {
    // Trigger the import
    try {
      (lazyComponent as unknown as { _init: (payload: unknown) => void })._init?.(component._payload);
    } catch {
      // Ignore - this is just preloading
    }
  }
}

/**
 * Named exports for common page lazy loading patterns
 */
export const createLazyPage = lazyLoad;
export const createLazyModal = lazyLoad;
export const createLazyWidget = lazyLoad;
