import { useEffect } from 'react';

/**
 * usePageTitle Hook
 * Sets the document title for better SEO and user experience
 * 
 * @param title - The page title (will be appended with site name)
 * @param deps - Optional dependencies array for dynamic titles
 * 
 * @example
 * // Static title
 * usePageTitle('Dashboard');
 * // Result: "Dashboard | Edutech"
 * 
 * // Dynamic title
 * usePageTitle(`${course.title} - Course Details`, [course.title]);
 */
function usePageTitle(title: string, deps: unknown[] = []): void {
  const siteName = 'Edutech';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${siteName}` : siteName;

    // Restore previous title on unmount
    return () => {
      document.title = previousTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, ...deps]);
}

export default usePageTitle;
