import { useEffect } from 'react';

const APP_NAME = 'EduTech';

interface UseDocumentTitleOptions {
  /** Whether to restore the previous title on unmount */
  restoreOnUnmount?: boolean;
  /** Suffix to append (default: app name) */
  suffix?: string;
  /** Custom separator (default: ' | ') */
  separator?: string;
}

/**
 * Hook to manage document title with proper cleanup
 * 
 * @param title - The page title
 * @param options - Configuration options
 * 
 * @example
 * // Simple usage
 * useDocumentTitle('Dashboard');
 * // Result: "Dashboard | EduTech"
 * 
 * @example
 * // Without suffix
 * useDocumentTitle('Dashboard', { suffix: '' });
 * // Result: "Dashboard"
 * 
 * @example
 * // With custom separator
 * useDocumentTitle('Dashboard', { separator: ' - ' });
 * // Result: "Dashboard - EduTech"
 */
const useDocumentTitle = (
  title: string,
  options: UseDocumentTitleOptions = {}
): void => {
  const {
    restoreOnUnmount = true,
    suffix = APP_NAME,
    separator = ' | ',
  } = options;

  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = suffix ? `${title}${separator}${suffix}` : title;
    document.title = fullTitle;

    return () => {
      if (restoreOnUnmount) {
        document.title = prevTitle;
      }
    };
  }, [title, suffix, separator, restoreOnUnmount]);
};

export default useDocumentTitle;

/**
 * Set document title imperatively (for use outside of components)
 */
export const setDocumentTitle = (
  title: string,
  options: { suffix?: string; separator?: string } = {}
): void => {
  const { suffix = APP_NAME, separator = ' | ' } = options;
  document.title = suffix ? `${title}${separator}${suffix}` : title;
};
