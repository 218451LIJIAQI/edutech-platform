import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import en from '@/locales/en';
import zh from '@/locales/zh';
import ms from '@/locales/ms';

export const languages = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
} as const;

export type LanguageCode = keyof typeof languages;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ms: { translation: ms },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'ms'],
    
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'edutech-language',
    },
    
    react: {
      useSuspense: true,
    },
  });

export default i18n;
