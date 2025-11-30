import { useEffect } from 'react';

interface MetaSEOProps {
  /** Page title - will be appended with site name */
  title?: string;
  /** Meta description for SEO */
  description?: string;
  /** Keywords for SEO (comma-separated) */
  keywords?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Canonical URL */
  canonical?: string;
  /** Page type for Open Graph */
  ogType?: 'website' | 'article' | 'course' | 'profile';
  /** Whether to prevent indexing */
  noIndex?: boolean;
}

/**
 * MetaSEO Component
 * Dynamically updates meta tags for SEO optimization
 * 
 * @example
 * <MetaSEO 
 *   title="Course Details"
 *   description="Learn React from scratch with our comprehensive course"
 *   keywords="react, javascript, web development"
 *   ogImage="/images/course-thumbnail.jpg"
 * />
 */
const MetaSEO = ({
  title,
  description = 'Edutech - A comprehensive learning platform connecting teachers and students worldwide.',
  keywords = 'education, online learning, courses, teachers, students',
  ogImage = '/og-image.png',
  canonical,
  ogType = 'website',
  noIndex = false,
}: MetaSEOProps) => {
  const siteName = 'Edutech';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper function to update or create meta tag
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:site_name', siteName, true);
    if (ogImage) {
      updateMetaTag('og:image', ogImage, true);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage);
    }

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Robots meta tag
    if (noIndex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Cleanup function to reset to defaults on unmount
    return () => {
      document.title = siteName;
    };
  }, [fullTitle, description, keywords, ogImage, canonical, ogType, noIndex]);

  return null;
};

export default MetaSEO;
