import { useEffect } from 'react';

/**
 * usePageTitle Hook
 * Sets the document title with the FlexiLearn platform brand suffix.
 */
function usePageTitle(title: string): void {
  const siteName = 'FlexiLearn';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${siteName}` : siteName;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export default usePageTitle;
