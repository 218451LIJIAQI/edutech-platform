import { useEffect } from 'react';

/**
 * usePageTitle Hook
 * Sets the document title for better SEO and user experience
 *
 * @param title - The page title (will be appended with site name)
 * @example
 * // Static title
 * usePageTitle('Dashboard');
 * // Result: "Dashboard | Edutech"
 */
function usePageTitle(title: string): void {
  const siteName = 'Edutech';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${siteName}` : siteName;

    // Restore previous title on unmount
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export default usePageTitle;
