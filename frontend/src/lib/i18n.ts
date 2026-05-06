import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import en from '@/locales/en';
import zh from '@/locales/zh';
import ms from '@/locales/ms';

export const languages = {
  en: { name: 'English', nativeName: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  zh: { name: 'Chinese', nativeName: '\u4E2D\u6587', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '\uD83C\uDDF2\uD83C\uDDFE' },
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
