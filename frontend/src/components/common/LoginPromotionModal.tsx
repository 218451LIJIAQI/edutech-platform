import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  ArrowRight,
  ExternalLink,
  Megaphone,
  MousePointerClick,
  Sparkles,
  X,
} from 'lucide-react';
import { useOverlayAccessibility } from '@/hooks';
import { useAuthStore } from '@/store/auth-store';
import adsService from '@/services/ads.service';
import { normalizeSafeHttpUrl, normalizeSafeInternalPath } from '@/utils/safe-url';
import clientLogger from '@/utils/logger';
import { AdCampaign, AdDestinationType, AdTheme, UserRole } from '@/types';

const DISMISSED_LOGIN_PROMOTION_SESSION_KEY =
  'dismissed-login-promotion-session-key';

const EXCLUDED_PATHS = ['/login', '/register', '/forgot-password'];
const AUTO_ROTATE_MS = 5000;

type ThemeStyle = {
  shell: string;
  orb: string;
  card: string;
  badge: string;
  button: string;
  progress: string;
};

const themeStyles: Record<AdTheme, ThemeStyle> = {
  MIDNIGHT: {
    shell: 'from-slate-950 via-slate-900 to-indigo-950 text-white',
    orb: 'from-cyan-400/25 via-indigo-400/15 to-fuchsia-400/10',
    card: 'border-white/10 bg-white/8',
    badge: 'bg-white/12 text-white border border-white/15',
    button: 'bg-white text-slate-900 hover:bg-slate-100',
    progress: 'from-cyan-300 via-sky-300 to-indigo-300',
  },
  SUNSET: {
    shell: 'from-rose-700 via-orange-500 to-amber-300 text-white',
    orb: 'from-white/20 via-amber-100/20 to-transparent',
    card: 'border-white/15 bg-black/10',
    badge: 'bg-white/18 text-white border border-white/20',
    button: 'bg-white text-rose-700 hover:bg-rose-50',
    progress: 'from-white via-amber-100 to-rose-100',
  },
  AURORA: {
    shell: 'from-emerald-700 via-teal-600 to-cyan-700 text-white',
    orb: 'from-lime-200/20 via-cyan-200/15 to-transparent',
    card: 'border-white/12 bg-black/10',
    badge: 'bg-white/18 text-white border border-white/20',
    button: 'bg-white text-emerald-700 hover:bg-emerald-50',
    progress: 'from-lime-200 via-emerald-100 to-cyan-100',
  },
  OCEAN: {
    shell: 'from-sky-700 via-blue-700 to-indigo-900 text-white',
    orb: 'from-cyan-200/20 via-sky-200/15 to-transparent',
    card: 'border-white/12 bg-black/12',
    badge: 'bg-white/18 text-white border border-white/20',
    button: 'bg-white text-blue-800 hover:bg-blue-50',
    progress: 'from-cyan-200 via-blue-100 to-indigo-100',
  },
  FOREST: {
    shell: 'from-emerald-900 via-green-800 to-lime-700 text-white',
    orb: 'from-lime-200/20 via-emerald-200/15 to-transparent',
    card: 'border-white/12 bg-black/12',
    badge: 'bg-white/18 text-white border border-white/20',
    button: 'bg-white text-emerald-800 hover:bg-emerald-50',
    progress: 'from-lime-200 via-emerald-100 to-green-100',
  },
  ROSE: {
    shell: 'from-fuchsia-800 via-pink-700 to-rose-700 text-white',
    orb: 'from-white/20 via-pink-100/20 to-transparent',
    card: 'border-white/12 bg-black/12',
    badge: 'bg-white/18 text-white border border-white/20',
    button: 'bg-white text-pink-700 hover:bg-pink-50',
    progress: 'from-white via-pink-100 to-rose-100',
  },
};

const readDismissedSessionKey = () => {
  try {
    return localStorage.getItem(DISMISSED_LOGIN_PROMOTION_SESSION_KEY);
  } catch {
    return null;
  }
};

const persistDismissedSessionKey = (sessionKey: string) => {
  try {
    localStorage.setItem(DISMISSED_LOGIN_PROMOTION_SESSION_KEY, sessionKey);
  } catch {
    // Ignore storage failures because this key only controls non-critical UI behavior.
  }
};

const isExcludedPath = (pathname: string) =>
  EXCLUDED_PATHS.some(
    (excludedPath) =>
      pathname === excludedPath || pathname.startsWith(`${excludedPath}/`)
  );

const getThemeStyle = (theme?: AdTheme | null): ThemeStyle =>
  theme ? themeStyles[theme] ?? themeStyles.MIDNIGHT : themeStyles.MIDNIGHT;

const buildDestinationMeta = (ad: AdCampaign) => {
  const isExternal = ad.destinationType === AdDestinationType.EXTERNAL;

  return {
    isExternal,
    pillLabel: isExternal ? 'External partner ad' : 'Internal promotion',
    hintLabel: isExternal ? 'Opens advertiser site' : 'Opens inside Edutech',
  };
};

const resolvePromotionNavigationTarget = (
  ad: AdCampaign
): { isExternal: boolean; url: string } | null => {
  if (ad.destinationType === AdDestinationType.EXTERNAL) {
    const url = normalizeSafeHttpUrl(ad.ctaUrl);
    return url ? { isExternal: true, url } : null;
  }

  const url = normalizeSafeInternalPath(ad.ctaUrl);
  return url ? { isExternal: false, url } : null;
};

const resolveSafeAssetUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  return normalizeSafeHttpUrl(url) || normalizeSafeInternalPath(url) || null;
};

export default function LoginPromotionModal() {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousSessionKeyRef = useRef<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginSessionKey, user } = useAuthStore();

  const [slides, setSlides] = useState<AdCampaign[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const handleClose = useCallback(() => {
    if (loginSessionKey) {
      persistDismissedSessionKey(loginSessionKey);
    }

    setIsOpen(false);
  }, [loginSessionKey]);

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: closeButtonRef,
    onClose: handleClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useEffect(() => {
    if (previousSessionKeyRef.current === loginSessionKey) {
      return;
    }

    previousSessionKeyRef.current = loginSessionKey;
    setSlides([]);
    setIsOpen(false);
    setActiveIndex(0);
    setLoadedSessionKey(null);
    setIsPaused(false);
  }, [loginSessionKey]);

  useEffect(() => {
    if (!isAuthenticated || !loginSessionKey || user?.role === UserRole.ADMIN) {
      setSlides([]);
      setLoadedSessionKey(null);
      return;
    }

    if (loadedSessionKey === loginSessionKey) {
      return;
    }

    if (readDismissedSessionKey() === loginSessionKey) {
      setSlides([]);
      setLoadedSessionKey(loginSessionKey);
      return;
    }

    let isCancelled = false;

    const loadPromotions = async () => {
      try {
        const items = await adsService.getLoginPromotions();

        if (isCancelled) {
          return;
        }

        const validSlides = items.filter((item) =>
          Boolean(resolvePromotionNavigationTarget(item))
        );

        setSlides(validSlides);
      } catch (error) {
        if (!isCancelled) {
          clientLogger.error('Failed to load login promotions:', error);
          setSlides([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadedSessionKey(loginSessionKey);
        }
      }
    };

    void loadPromotions();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, loadedSessionKey, loginSessionKey, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || !loginSessionKey || user?.role === UserRole.ADMIN) {
      setIsOpen(false);
      return;
    }

    if (isExcludedPath(location.pathname)) {
      setIsOpen(false);
      return;
    }

    if (slides.length === 0) {
      setIsOpen(false);
      return;
    }

    if (readDismissedSessionKey() === loginSessionKey) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [isAuthenticated, location.pathname, loginSessionKey, slides.length, user?.role]);

  useEffect(() => {
    if (!isOpen || isPaused || slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTO_ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, isPaused, slides.length]);

  useEffect(() => {
    if (slides.length === 0) {
      if (activeIndex !== 0) {
        setActiveIndex(0);
      }
      return;
    }

    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  const currentSlide = useMemo(
    () => (slides.length > 0 ? slides[activeIndex] : undefined),
    [activeIndex, slides]
  );

  const currentTheme = useMemo(
    () => getThemeStyle(currentSlide?.theme),
    [currentSlide?.theme]
  );

  const destinationMeta = useMemo(
    () => (currentSlide ? buildDestinationMeta(currentSlide) : null),
    [currentSlide]
  );

  const safeImageUrl = useMemo(
    () => resolveSafeAssetUrl(currentSlide?.imageUrl),
    [currentSlide?.imageUrl]
  );

  const handlePromotionClick = useCallback(() => {
    if (!currentSlide) {
      return;
    }

    const navigationTarget = resolvePromotionNavigationTarget(currentSlide);

    if (!navigationTarget) {
      return;
    }

    handleClose();

    if (currentSlide.openInNewTab) {
      const openedWindow = window.open(
        navigationTarget.url,
        '_blank',
        'noopener,noreferrer'
      );

      if (openedWindow) {
        openedWindow.opener = null;
      }

      return;
    }

    if (navigationTarget.isExternal) {
      window.location.assign(navigationTarget.url);
      return;
    }

    navigate(navigationTarget.url);
  }, [currentSlide, handleClose, navigate]);

  if (
    typeof document === 'undefined' ||
    !isOpen ||
    !currentSlide ||
    !destinationMeta
  ) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-promotion-title"
        aria-describedby="login-promotion-description"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        className={clsx(
          'relative w-full max-w-5xl overflow-hidden rounded-[2rem] border shadow-[0_40px_120px_rgba(15,23,42,0.45)]',
          'bg-gradient-to-br',
          currentTheme.shell
        )}
      >
        <div
          className={clsx(
            'pointer-events-none absolute inset-0 bg-gradient-to-br',
            currentTheme.orb
          )}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-black/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur"
                aria-hidden="true"
              >
                <Megaphone className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-white/75">
                  Login Spotlight
                </p>
                <p className="text-sm text-white/65">
                  {slides.length} active campaign{slides.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label="Close promotion popup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {slides.length > 1 ? (
            <div className="mt-4 flex gap-2" aria-label="Promotion slides">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="group flex-1 focus:outline-none"
                  aria-label={`Show promotion ${index + 1}`}
                  aria-pressed={index === activeIndex}
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-white/15">
                    <span
                      className={clsx(
                        'block h-full rounded-full bg-gradient-to-r transition-all duration-300',
                        currentTheme.progress,
                        index === activeIndex ? 'w-full' : 'w-0',
                        slide.id === currentSlide.id
                          ? 'opacity-100'
                          : 'opacity-35 group-hover:opacity-60'
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative grid gap-6 p-5 sm:grid-cols-[1.05fr,1fr] sm:p-7">
          <div
            className={clsx(
              'relative overflow-hidden rounded-[1.75rem] border p-5 sm:p-6',
              currentTheme.card
            )}
          >
            {safeImageUrl ? (
              <>
                <img
                  src={safeImageUrl}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-slate-950/15"
                  aria-hidden="true"
                />
              </>
            ) : (
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_32%)]"
                aria-hidden="true"
              />
            )}

            <div className="relative flex h-full min-h-[280px] flex-col justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                    currentTheme.badge
                  )}
                >
                  {currentSlide.badge || 'Featured promotion'}
                </span>

                <span className="inline-flex rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs font-medium text-white/80">
                  {destinationMeta.pillLabel}
                </span>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/80">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Session-only display to avoid repeat interruption
                </div>

                <div className="max-w-sm">
                  <p className="text-xs font-semibold uppercase text-white/65">
                    Campaign Preview
                  </p>

                  <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
                    {currentSlide.title}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/80">
                    {currentSlide.supportingText || currentSlide.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                  <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                  {destinationMeta.hintLabel}
                </span>

                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                  {currentSlide.sponsorName
                    ? `Sponsored by ${currentSlide.sponsorName}`
                    : 'Platform ad'}
                </span>
              </div>

              <h2
                id="login-promotion-title"
                className="mt-5 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl"
              >
                {currentSlide.title}
              </h2>

              <p
                id="login-promotion-description"
                className="mt-4 max-w-xl text-base leading-7 text-white/82"
              >
                {currentSlide.description}
              </p>

              {currentSlide.supportingText ? (
                <div className="mt-5 rounded-3xl border border-white/12 bg-black/15 p-4 text-sm leading-6 text-white/82 backdrop-blur-sm">
                  {currentSlide.supportingText}
                </div>
              ) : null}
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePromotionClick}
                  className={clsx(
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/70',
                    currentTheme.button
                  )}
                >
                  <span>{currentSlide.ctaLabel}</span>

                  {currentSlide.destinationType === AdDestinationType.EXTERNAL ||
                  currentSlide.openInNewTab ? (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-medium text-white/88 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  Dismiss for this login
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {slides.length > 1 ? (
                  <div className="flex items-center gap-2" aria-label="Promotion navigation">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={clsx(
                          'h-3 w-3 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-white/70',
                          index === activeIndex
                            ? 'scale-110 border-white bg-white'
                            : 'border-white/35 bg-white/20 hover:bg-white/40'
                        )}
                        aria-label={`Show promotion ${index + 1}`}
                        aria-pressed={index === activeIndex}
                      />
                    ))}
                  </div>
                ) : (
                  <span />
                )}

                <p className="text-xs text-white/65">
                  Auto-rotates every {AUTO_ROTATE_MS / 1000}s. Hover or focus pauses rotation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
