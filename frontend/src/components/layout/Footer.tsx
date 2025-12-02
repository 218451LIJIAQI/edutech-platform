import { Link } from 'react-router-dom';
import { BookOpen, Heart, Mail, ArrowRight } from 'lucide-react';

/**
 * Footer Component - Refined & Elegant Design
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { to: '/courses', label: 'Courses' },
    { to: '/teachers', label: 'Teachers' },
    { to: '/community', label: 'Community' },
    { to: '/help', label: 'Help Center' },
  ];

  const socialLinks = [
    { name: 'X', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { name: 'GitHub', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' },
    { name: 'LinkedIn', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:24px_24px]" />
      
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Brand Section */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start gap-1">
            <Link to="/" className="group flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 rounded-xl blur-lg group-hover:bg-primary-500/30 transition-colors" />
                <div className="relative p-2.5 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold text-white">Edutech</span>
                <span className="hidden sm:inline text-xs text-gray-500 ml-2">Platform</span>
              </div>
            </Link>
            
            {/* Contact Email */}
            <a 
              href="mailto:support@edutech.com" 
              className="group flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>support@edutech.com</span>
              <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </a>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-4 flex justify-center">
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to}
                  className="relative text-sm text-gray-400 hover:text-white transition-colors group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary-500 group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Social Links */}
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a 
                  key={social.name}
                  href="#" 
                  title={social.name}
                  aria-label={social.name}
                  className="group relative w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
                >
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-500/0 to-indigo-500/0 group-hover:from-primary-500/20 group-hover:to-indigo-500/20 transition-all" />
                  <svg className="relative w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 py-2">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
            © {currentYear} Edutech. Crafted with
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
            for learners worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
