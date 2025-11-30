import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { languages, LanguageCode } from '@/lib/i18n';

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
 * Language Switcher Component
 * Single button that cycles through languages
 */
const LanguageSwitcher = ({ variant = 'cycle', className, showLabel = false }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const [currentLangCode, setCurrentLangCode] = useState<LanguageCode>('en');
  
  // Sync with i18n language
  useEffect(() => {
    const lang = (i18n.language?.split('-')[0] || 'en') as LanguageCode;
    if (languageOrder.includes(lang)) {
      setCurrentLangCode(lang);
    }
  }, [i18n.language]);

  const currentLang = languages[currentLangCode] || languages.en;

  // Cycle to next language
  const cycleLanguage = () => {
    const currentIndex = languageOrder.indexOf(currentLangCode);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    const nextLang = languageOrder[nextIndex];
    
    i18n.changeLanguage(nextLang);
    setCurrentLangCode(nextLang);
    
    // Show toast notification
    const langInfo = languages[nextLang];
    toast.success(`${langInfo.flag} ${langInfo.nativeName}`, {
      duration: 1500,
      position: 'bottom-center',
    });
  };

  // Get next language for tooltip
  const getNextLanguage = () => {
    const currentIndex = languageOrder.indexOf(currentLangCode);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    return languages[languageOrder[nextIndex]];
  };

  // Icon only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={cycleLanguage}
        className={clsx(
          'p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 group',
          className
        )}
        title={`Switch to ${getNextLanguage().name}`}
      >
        <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  // Default cycle variant - shows current flag, click to cycle
  return (
    <button
      onClick={cycleLanguage}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group',
        className
      )}
      title={`Current: ${currentLang.name} | Click to switch to ${getNextLanguage().name}`}
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{currentLang.flag}</span>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600">{currentLang.nativeName}</span>
      )}
    </button>
  );
};

export default LanguageSwitcher;
