import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Copyright, Heart, Mail } from 'lucide-react';
import { publicSiteConfig } from '@/config/public-site';

/**
 * Footer Component
 * Provides brand information, main public navigation, support contact,
 * social links, and copyright information.
 */

type NavLink = {
  to: string;
  label: string;
};

type SocialLink = {
  name: string;
  url?: string | null;
  iconPath: string;
};

type VisibleSocialLink = {
  name: string;
  url: string;
  iconPath: string;
};

const NAV_LINKS: NavLink[] = [
  { to: '/courses', label: 'Courses' },
  { to: '/teachers', label: 'Teachers' },
  { to: '/community', label: 'Community' },
  { to: '/help', label: 'Help Center' },
];

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'X',
    url: publicSiteConfig.socialXUrl,
    iconPath:
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    name: 'GitHub',
    url: publicSiteConfig.socialGithubUrl,
    iconPath:
      'M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.562 21.8 24 17.302 24 12c0-6.627-5.373-12-12-12z',
  },
  {
    name: 'LinkedIn',
    url: publicSiteConfig.socialLinkedinUrl,
    iconPath:
      'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
];

const getVisibleSocialLinks = (): VisibleSocialLink[] =>
  SOCIAL_LINKS.map((social) => ({
    ...social,
    url: social.url?.trim() ?? '',
  })).filter((social): social is VisibleSocialLink => social.url.length > 0);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const visibleSocialLinks = getVisibleSocialLinks();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Subtle background pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:24px_24px] opacity-[0.015]"
      />

      {/* Top accent line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 items-center gap-5 py-6 md:grid-cols-12 md:gap-4">
          {/* Brand Section */}
          <div className="flex flex-col items-center gap-2 md:col-span-4 md:items-start">
            <Link
              to="/"
              aria-label="Go to Edutech homepage"
              className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary-500/20 blur-lg transition-colors group-hover:bg-primary-500/30" />
                <div className="relative rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 p-2.5 shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </div>

              <div>
                <span className="text-lg font-bold text-white">Edutech</span>
                <span className="ml-2 hidden text-xs text-gray-500 sm:inline">
                  Platform
                </span>
              </div>
            </Link>

            {publicSiteConfig.supportEmail ? (
              <a
                href={`mailto:${publicSiteConfig.supportEmail}`}
                className="group flex items-center gap-2 rounded-md text-sm text-gray-400 transition-colors hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>{publicSiteConfig.supportEmail}</span>
                <ArrowRight
                  className="h-3 w-3 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <Link
                to="/help"
                className="group flex items-center gap-2 rounded-md text-sm text-gray-400 transition-colors hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>Help and support</span>
                <ArrowRight
                  className="h-3 w-3 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex justify-center md:col-span-4">
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap justify-center gap-x-6 gap-y-2"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group relative rounded-md text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-px w-0 bg-primary-500 transition-all duration-300 group-hover:w-full"
                  />
                </Link>
              ))}
            </nav>
          </div>

          {/* Social Links */}
          <div className="flex justify-center md:col-span-4 md:justify-end">
            {visibleSocialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {visibleSocialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit Edutech on ${social.name}`}
                    title={social.name}
                    className="group relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-500/0 to-indigo-500/0 transition-all group-hover:from-primary-500/20 group-hover:to-indigo-500/20"
                    />
                    <svg
                      aria-hidden="true"
                      className="relative h-4 w-4 text-gray-500 transition-colors group-hover:text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d={social.iconPath} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 py-3">
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-sm text-gray-500">
            <Copyright className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{currentYear} Edutech. Crafted with</span>
            <Heart
              className="h-3.5 w-3.5 fill-rose-500 text-rose-500"
              aria-hidden="true"
            />
            <span>for learners worldwide.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;