import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { languages, LanguageCode } from '@/lib/i18n';
import clientLogger from '@/utils/logger';

interface LanguageSwitcherProps {
  /** Display style variant */
  variant?: 'cycle' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
}

const languageOrder: LanguageCode[] = ['en', 'zh', 'ms'];

/**
 * LanguageSwitcher Component
 *
 * A single-button language switcher that cycles through supported languages.
 * It supports both icon-only and flag-with-label display modes.
 */
const LanguageSwitcher = ({
  variant = 'cycle',
  className,
  showLabel = false,
}: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const currentLangCode = useMemo<LanguageCode>(() => {
    const normalizedLang = i18n.language?.split('-')[0] as LanguageCode;
    return languageOrder.includes(normalizedLang) ? normalizedLang : 'en';
  }, [i18n.language]);

  const currentLang = languages[currentLangCode] ?? languages.en;

  const nextLangCode = useMemo<LanguageCode>(() => {
    const currentIndex = languageOrder.indexOf(currentLangCode);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    return languageOrder[(safeIndex + 1) % languageOrder.length];
  }, [currentLangCode]);

  const nextLang = languages[nextLangCode] ?? languages.en;

  const cycleLanguage = useCallback(async () => {
    if (isChanging) return;

    try {
      setIsChanging(true);
      await i18n.changeLanguage(nextLangCode);

      toast.success(`${nextLang.flag} ${nextLang.nativeName}`, {
        duration: 1500,
        position: 'bottom-center',
      });
    } catch (error) {
      clientLogger.error('Failed to change language:', error);
      toast.error('Failed to switch language. Please try again.', {
        duration: 2000,
        position: 'bottom-center',
      });
    } finally {
      setIsChanging(false);
    }
  }, [i18n, nextLangCode, nextLang, isChanging]);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={cycleLanguage}
        disabled={isChanging}
        aria-label={`Switch language to ${nextLang.name}`}
        title={`Switch to ${nextLang.name}`}
        className={clsx(
          'p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleLanguage}
      disabled={isChanging}
      aria-label={`Current language is ${currentLang.name}. Switch to ${nextLang.name}`}
      title={`Current: ${currentLang.name} | Click to switch to ${nextLang.name}`}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      <span className="text-xl group-hover:scale-110 transition-transform">
        {currentLang.flag}
      </span>

      {showLabel && (
        <span className="text-sm font-medium text-gray-600">
          {currentLang.nativeName}
        </span>
      )}
    </button>
  );
};

export default LanguageSwitcher;
